using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
// The enclosing namespace declares its own AccountStatus (this request's own Status property, below) — this
// alias reaches the Domain entity's enum of the same simple name unambiguously.
using DomainAccountStatus = DKNet.Accounts.Domains.Features.Accounts.Entities.AccountStatus;

namespace DKNet.Accounts.AppServices.Accounts.V1.Actions;

/// <summary>
/// Partial update — <c>PATCH /accounts/{id}</c>. Setting <see cref="Status"/> to
/// <see cref="AccountStatus.Closed"/> is how an account is closed; refused while it holds any balance or
/// held amount. R9: every other status change, including <c>Closed</c> → <c>Active</c> (reopening) and
/// <c>Dormant</c> → <c>Active</c>, is permitted freely.
/// </summary>
public sealed record UpdateAccountRequest : Fluents.Requests.IWitResponse<AccountDto>
{
    public Guid Id { get; set; }

    public string? Name { get; set; }

    public AccountStatus? Status { get; set; }

    public decimal? OverdraftLimit { get; set; }

    public decimal? MinimumBalance { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

internal sealed class UpdateAccountCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    ICallingSystemAccessor callingSystem)
    : Fluents.Requests.IHandler<UpdateAccountRequest, AccountDto>
{
    public async Task<IResult<AccountDto>> OnHandle(UpdateAccountRequest request, CancellationToken cancellationToken)
    {
        var byUser = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(byUser))
        {
            return Result.Fail<AccountDto>("The caller is not authenticated.");
        }

        var account = await repository.FirstOrDefaultAsync(new SpecGetAccount(request.Id), cancellationToken);
        if (account is null)
        {
            return Result.Fail<AccountDto>(new NotFoundError($"The account {request.Id} was not found."));
        }

        if (request.Name is not null)
        {
            account.Rename(request.Name, byUser);
        }

        if (request.OverdraftLimit is not null || request.MinimumBalance is not null)
        {
            // R3 at update: PermittedToGoNegative has no update field (immutable post-open) and a null
            // OverdraftLimit here means "leave unchanged", so this can only ever refuse a combination Open
            // already refuses to create — kept as a defense-in-depth guard, not a reachable path through this
            // DTO shape today.
            var mergedOverdraftLimit = request.OverdraftLimit ?? account.OverdraftLimit;
            if (AccountFloorPolicy.RequiresOverdraftLimit(account.PermittedToGoNegative, mergedOverdraftLimit))
            {
                return Result.Fail<AccountDto>(LedgerErrors.Error(
                    LedgerErrors.OverdraftLimitRequired,
                    "An account permitted to go negative must state its overdraft limit."));
            }

            if (request.OverdraftLimit is not null)
            {
                account.ChangeOverdraftLimit(request.OverdraftLimit, byUser);
            }

            if (request.MinimumBalance is not null)
            {
                account.ChangeMinimumBalance(request.MinimumBalance, byUser);
            }
        }

        if (request.Metadata is not null)
        {
            account.ChangeMetadata(request.Metadata, byUser);
        }

        if (request.Status is not null && (DomainAccountStatus?)request.Status != account.Status)
        {
            if (request.Status == AccountStatus.Closed && (account.Balance != 0m || account.HeldAmount != 0m))
            {
                return Result.Fail<AccountDto>(LedgerErrors.Error(
                    LedgerErrors.AccountHoldsBalance, "Cannot close an account while it still holds a balance."));
            }

            account.ChangeStatus((DomainAccountStatus)request.Status.Value, byUser);
        }

        return Result.Ok(mapper.Map<AccountDto>(account));
    }
}
