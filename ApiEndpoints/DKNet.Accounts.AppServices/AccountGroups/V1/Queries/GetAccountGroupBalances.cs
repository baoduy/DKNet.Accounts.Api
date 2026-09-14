namespace DKNet.Accounts.AppServices.AccountGroups.V1.Queries;

public sealed record GetAccountGroupBalancesQuery
    : Fluents.Queries.IWitResponse<IReadOnlyCollection<AccountGroupBalanceLineDto>>
{
    public required Guid Id { get; init; }
}

internal sealed class GetAccountGroupBalancesQueryHandler
    : Fluents.Queries.IHandler<GetAccountGroupBalancesQuery, IReadOnlyCollection<AccountGroupBalanceLineDto>>
{
    public Task<IReadOnlyCollection<AccountGroupBalanceLineDto>?> OnHandle(
        GetAccountGroupBalancesQuery request,
        CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
