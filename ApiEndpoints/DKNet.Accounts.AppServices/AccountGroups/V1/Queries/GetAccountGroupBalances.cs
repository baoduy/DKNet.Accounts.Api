using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Queries;

public sealed record GetAccountGroupBalancesQuery
    : Fluents.Queries.IWitResponse<IReadOnlyCollection<AccountGroupBalanceLineDto>>
{
    public required Guid Id { get; init; }
}

/// <summary>
/// One line per currency, never a combined total (R4) — the group's own accounts only (Q3: consolidated
/// parent-group balances are deferred). Each line's balance is the real, postings-driven sum of every
/// account the group holds in that currency.
/// </summary>
internal sealed class GetAccountGroupBalancesQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IHandler<GetAccountGroupBalancesQuery, IReadOnlyCollection<AccountGroupBalanceLineDto>>
{
    public async Task<IReadOnlyCollection<AccountGroupBalanceLineDto>?> OnHandle(
        GetAccountGroupBalancesQuery request,
        CancellationToken cancellationToken) =>
        await repository.Query(new SpecListAccounts(groupId: request.Id))
            .GroupBy(a => a.CurrencyCode)
            .Select(g => new AccountGroupBalanceLineDto
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
