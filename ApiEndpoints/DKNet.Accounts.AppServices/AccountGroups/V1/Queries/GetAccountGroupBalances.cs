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
/// parent-group balances are deferred). Every account is at a permanently zero balance in this delivery, so
/// every line here reads 0.00 until the next stage's postings can move it.
/// </summary>
internal sealed class GetAccountGroupBalancesQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IHandler<GetAccountGroupBalancesQuery, IReadOnlyCollection<AccountGroupBalanceLineDto>>
{
    public async Task<IReadOnlyCollection<AccountGroupBalanceLineDto>?> OnHandle(
        GetAccountGroupBalancesQuery request,
        CancellationToken cancellationToken) =>
        await repository.Query(new SpecListAccounts(groupId: request.Id))
            .GroupBy(a => a.CurrencyCode)
            .Select(g => new AccountGroupBalanceLineDto { Currency = g.Key, Balance = g.Sum(a => a.Balance) })
            .ToListAsync(cancellationToken);
}
