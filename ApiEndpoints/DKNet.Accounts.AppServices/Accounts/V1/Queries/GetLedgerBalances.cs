using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.AppServices.Accounts.V1.Queries;

public sealed record GetLedgerBalancesQuery : Fluents.Queries.IWitResponse<IReadOnlyCollection<LedgerBalanceLineDto>>;

/// <summary>
/// One line per currency across every account in the ledger, never a combined total (R1: balances of
/// different currencies are never summed). Includes closed accounts (§9 Q2) — this is the ledger's real
/// position, and a closed account carries no balance anyway.
/// </summary>
internal sealed class GetLedgerBalancesQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IHandler<GetLedgerBalancesQuery, IReadOnlyCollection<LedgerBalanceLineDto>>
{
    public async Task<IReadOnlyCollection<LedgerBalanceLineDto>?> OnHandle(
        GetLedgerBalancesQuery request,
        CancellationToken cancellationToken) =>
        await repository.Query(new SpecListAccounts())
            .GroupBy(a => a.CurrencyCode)
            .Select(g => new LedgerBalanceLineDto
            {
                Currency = g.Key,
                Balance = g.Sum(a => a.Balance),
                // R1: available always equals balance (no hold mechanism exists yet) — read off the account's
                // own Balance column rather than its unmapped AvailableBalance computed property.
                Available = g.Sum(a => a.Balance),
                Held = g.Sum(a => a.HeldAmount)
            })
            .ToListAsync(cancellationToken);
}

public sealed record LedgerBalanceLineDto
{
    public required string Currency { get; init; }

    public decimal Balance { get; init; }

    public decimal Available { get; init; }

    public decimal Held { get; init; }
}
