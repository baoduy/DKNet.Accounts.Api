using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

/// <summary>
/// Partial update — <c>PATCH /account-groups/{id}</c>, narrowed to <see cref="Status"/> (DRK-1277 §11/§12):
/// rename, description and metadata moved off this route onto their own generated <c>[CrudUpdate]</c> routes.
/// Unset properties leave the current value untouched. Setting <see cref="Status"/> to
/// <see cref="AccountGroupStatus.Closed"/> is how a group is closed.
/// </summary>
public sealed record UpdateAccountGroupRequest : Fluents.Requests.IWitResponse<AccountGroupDto>
{
    public Guid Id { get; set; }

    public AccountGroupStatus? Status { get; set; }
}

/// <summary>
/// Closes a group only when no account it holds still carries a balance.
/// </summary>
internal sealed class UpdateAccountGroupCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    ICallingSystemAccessor callingSystem)
    : Fluents.Requests.IHandler<UpdateAccountGroupRequest, AccountGroupDto>
{
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
}
