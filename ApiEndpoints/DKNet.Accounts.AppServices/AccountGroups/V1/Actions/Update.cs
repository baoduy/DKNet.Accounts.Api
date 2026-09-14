using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using Microsoft.EntityFrameworkCore;
// The enclosing namespace declares its own AccountGroupStatus (this request's own Status property, below) —
// this alias reaches the Domain entity's enum of the same simple name unambiguously.
using DomainAccountGroupStatus = DKNet.Accounts.Domains.Features.AccountGroups.Entities.AccountGroupStatus;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

/// <summary>
/// Partial update — <c>PATCH /account-groups/{id}</c>. Unset properties leave the current value untouched.
/// Setting <see cref="Status"/> to <see cref="AccountGroupStatus.Closed"/> is how a group is closed.
/// </summary>
public sealed record UpdateAccountGroupRequest : Fluents.Requests.IWitResponse<AccountGroupDto>
{
    public Guid Id { get; set; }

    public string? Name { get; set; }

    public string? Description { get; set; }

    public AccountGroupStatus? Status { get; set; }

    public Guid? ParentId { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

/// <summary>
/// Applies each provided field, re-parents (walking the whole ancestor chain to refuse a cycle — R7), and
/// closes only when no account it holds still carries a balance.
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
        var byUser = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(byUser))
        {
            return Result.Fail<AccountGroupDto>("The caller is not authenticated.");
        }

        var group = await repository.FirstOrDefaultAsync(new SpecGetAccountGroup(request.Id), cancellationToken);
        if (group is null)
        {
            return Result.Fail<AccountGroupDto>(new NotFoundError($"The account group {request.Id} was not found."));
        }

        if (request.Name is not null)
        {
            group.Rename(request.Name, byUser);
        }

        if (request.Description is not null)
        {
            group.ChangeDescription(request.Description, byUser);
        }

        if (request.Metadata is not null)
        {
            group.ChangeMetadata(request.Metadata, byUser);
        }

        if (request.ParentId is not null && request.ParentId != group.ParentId)
        {
            if (await FormsCycleAsync(group.Id, request.ParentId.Value, cancellationToken))
            {
                return Result.Fail<AccountGroupDto>(LedgerErrors.Error(
                    LedgerErrors.GroupCycle, "A group cannot become its own ancestor."));
            }

            group.Reparent(request.ParentId, byUser);
        }

        if (request.Status is not null && (DomainAccountGroupStatus?)request.Status != group.Status)
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

                group.Close(byUser);
            }
            else
            {
                group.Activate(byUser);
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
