using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.AppServices.Accounts.V1.Actions;

/// <summary>
/// Partial update — <c>PATCH /accounts/{id}</c>, narrowed to <see cref="Status"/>, <see cref="OverdraftLimit"/>,
/// <see cref="MinimumBalance"/> and <see cref="PermittedToGoNegative"/> (DRK-1277 §11/§12, DRK-1659 §5 surface
/// 3): rename and metadata moved off this route onto their own generated <c>[CrudUpdate]</c> routes. Setting
/// <see cref="Status"/> to <see cref="AccountStatus.Closed"/> is how an account is closed; refused while it
/// holds any balance or held amount. R9: every other status change, including <c>Closed</c> → <c>Active</c>
/// (reopening) and <c>Dormant</c> → <c>Active</c>, is permitted freely.
/// </summary>
public sealed record UpdateAccountRequest : Fluents.Requests.IWitResponse<AccountDto>
{
    public Guid Id { get; set; }

    public AccountStatus? Status { get; set; }

    public decimal? OverdraftLimit { get; set; }

    public decimal? MinimumBalance { get; set; }

    /// <summary>Left out means unchanged, same as its sibling floor controls (DRK-1659 §5 surface 3 R2).</summary>
    public bool? PermittedToGoNegative { get; set; }
}

internal sealed class UpdateAccountCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    ICallingSystemAccessor callingSystem)
    : Fluents.Requests.IHandler<UpdateAccountRequest, AccountDto>
{
    public async Task<IResult<AccountDto>> OnHandle(UpdateAccountRequest request, CancellationToken cancellationToken)
    {
        var callingSystemId = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(callingSystemId))
        {
            return Result.Fail<AccountDto>("The caller is not authenticated.");
        }

        var account = await repository.FirstOrDefaultAsync(new SpecGetAccount(request.Id), cancellationToken);
        if (account is null)
        {
            return Result.Fail<AccountDto>(new NotFoundError($"The account {request.Id} was not found."));
        }

        if (request.OverdraftLimit is not null || request.MinimumBalance is not null || request.PermittedToGoNegative is not null)
        {
            // R1 at update, same as at open: PermittedToGoNegative is now editable (DRK-1659 §5 surface 3),
            // so the merged candidate — request value or current, for both the permission and the limit —
            // must still resolve to exactly one determinate floor before anything on the account changes.
            var mergedPermittedToGoNegative = request.PermittedToGoNegative ?? account.PermittedToGoNegative;
            var mergedOverdraftLimit = request.OverdraftLimit ?? account.OverdraftLimit;
            if (AccountFloorPolicy.RequiresOverdraftLimit(mergedPermittedToGoNegative, mergedOverdraftLimit))
            {
                return Result.Fail<AccountDto>(LedgerErrors.Error(
                    LedgerErrors.OverdraftLimitRequired,
                    "An account permitted to go negative must state its overdraft limit."));
            }

            if (request.PermittedToGoNegative is not null)
            {
                account.ChangePermittedToGoNegative(request.PermittedToGoNegative.Value);
            }

            if (request.OverdraftLimit is not null)
            {
                account.ChangeOverdraftLimit(request.OverdraftLimit);
            }

            if (request.MinimumBalance is not null)
            {
                account.ChangeMinimumBalance(request.MinimumBalance);
            }
        }

        if (request.Status is not null && request.Status != account.Status)
        {
            if (request.Status == AccountStatus.Closed && (account.Balance != 0m || account.HeldAmount != 0m))
            {
                return Result.Fail<AccountDto>(LedgerErrors.Error(
                    LedgerErrors.AccountHoldsBalance, "Cannot close an account while it still holds a balance."));
            }

            account.ChangeStatus(request.Status.Value);
        }

        return Result.Ok(mapper.Map<AccountDto>(account));
    }
}
