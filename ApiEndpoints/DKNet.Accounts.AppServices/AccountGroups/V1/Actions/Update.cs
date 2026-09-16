using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

/// <summary>
/// Partial update — <c>PATCH /account-groups/{id}</c>, narrowed to <see cref="Status"/> and
/// <see cref="ParentId"/> (DRK-1277 §11/§12): rename, description and metadata moved off this route onto
/// their own generated <c>[CrudUpdate]</c> routes. Unset properties leave the current value untouched.
/// Setting <see cref="Status"/> to <see cref="AccountGroupStatus.Closed"/> is how a group is closed.
/// </summary>
public sealed record UpdateAccountGroupRequest : Fluents.Requests.IWitResponse<AccountGroupDto>
{
    public Guid Id { get; set; }

    public AccountGroupStatus? Status { get; set; }

    public Guid? ParentId { get; set; }
}

/// <summary>
/// Re-parents (walking the whole ancestor chain to refuse a cycle — R7) and closes only when no account it
/// holds still carries a balance.
/// </summary>
internal sealed class UpdateAccountGroupCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    ICallingSystemAccessor callingSystem)
    : Fluents.Requests.IHandler<UpdateAccountGroupRequest, AccountGroupDto>
{
    /// <summary>Bounds the ancestor walk against a pre-existing, unrelated corrupt cycle in the data.</summary>
    private const int MaxAncestorDepth = 1000;

    public async Task<IResult<AccountGroupDto>> OnHandle(
        UpdateAccountGroupRequest request,
        CancellationToken cancellationToken)
    {
        var callingSystemId = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(callingSystemId))
        {
            return Result.Fail<AccountGroupDto>("The caller is not authenticated.");
        }

        var group = await repository.FirstOrDefaultAsync(new SpecGetAccountGroup(request.Id), cancellationToken);
        if (group is null)
        {
            return Result.Fail<AccountGroupDto>(new NotFoundError($"The account group {request.Id} was not found."));
        }

        if (request.ParentId is not null && request.ParentId != group.ParentId)
        {
            if (await FormsCycleAsync(group.Id, request.ParentId.Value, cancellationToken))
            {
                return Result.Fail<AccountGroupDto>(LedgerErrors.Error(
                    LedgerErrors.GroupCycle, "A group cannot become its own ancestor."));
            }

            group.Reparent(request.ParentId);
        }

        if (request.Status is not null && request.Status != group.Status)
        {
            if (request.Status == AccountGroupStatus.Closed)
            {
                var holdsBalance = await repository.Query(new SpecListAccounts(groupId: group.Id))
                    .AnyAsync(a => a.Balance != 0m || a.HeldAmount != 0m, cancellationToken);
                if (holdsBalance)
                {
                    return Result.Fail<AccountGroupDto>(LedgerErrors.Error(
                        LedgerErrors.GroupHoldsBalance,
                        "Cannot close a group while any account it holds still carries a balance."));
                }

                group.Close();
            }
            else
            {
                group.Activate();
            }
        }

        return Result.Ok(mapper.Map<AccountGroupDto>(group));
    }

    /// <summary>Walks the candidate parent's ancestor chain (R7: the whole chain, not just the immediate
    /// parent) looking for <paramref name="groupId"/>.</summary>
    private async Task<bool> FormsCycleAsync(Guid groupId, Guid candidateParentId, CancellationToken ct)
    {
        var currentId = (Guid?)candidateParentId;
        var visited = new HashSet<Guid>();

        for (var depth = 0; depth < MaxAncestorDepth && currentId is not null; depth++)
        {
            if (currentId == groupId)
            {
                return true;
            }

            if (!visited.Add(currentId.Value))
            {
                break;
            }

            currentId = await repository.Query(new SpecGetAccountGroup(currentId))
                .Select(g => g.ParentId)
                .FirstOrDefaultAsync(ct);
        }

        return false;
    }
}
