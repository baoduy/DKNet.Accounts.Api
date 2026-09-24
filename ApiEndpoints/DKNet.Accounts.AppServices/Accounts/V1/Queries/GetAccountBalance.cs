using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.AppServices.Accounts.V1.Queries;

public sealed record GetAccountBalanceQuery : Fluents.Queries.IWitResponse<AccountBalanceDto>
{
    public required Guid Id { get; init; }
}

/// <summary><see cref="AccountBalanceDto.Balance"/> is the account's real, postings-driven running total.
/// R8: <see cref="AccountBalanceDto.AvailableBalance"/> always equals it and
/// <see cref="AccountBalanceDto.HeldAmount"/> is always 0 — no hold mechanism exists yet.
/// <see cref="AccountBalanceDto.Floor"/> (§3 row 6) is computed from the account's own floor controls via
/// <see cref="AccountFloorPolicy.Floor"/> — never stored — which needs the materialized entity rather than
/// an EF projection, so this fetches the account itself instead of projecting straight to the DTO.</summary>
internal sealed class GetAccountBalanceQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IHandler<GetAccountBalanceQuery, AccountBalanceDto>
{
    public async Task<AccountBalanceDto?> OnHandle(GetAccountBalanceQuery request, CancellationToken cancellationToken)
    {
        var account = await repository.Query(new SpecGetAccount(request.Id)).FirstOrDefaultAsync(cancellationToken);
        if (account is null)
        {
            return null;
        }

        return new AccountBalanceDto
        {
            Currency = account.CurrencyCode,
            Balance = account.Balance,
            AvailableBalance = account.AvailableBalance,
            HeldAmount = account.HeldAmount,
            Floor = AccountFloorPolicy.Floor(account.PermittedToGoNegative, account.OverdraftLimit, account.MinimumBalance)
        };
    }
}
