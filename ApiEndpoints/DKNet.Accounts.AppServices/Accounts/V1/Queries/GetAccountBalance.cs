namespace DKNet.Accounts.AppServices.Accounts.V1.Queries;

public sealed record GetAccountBalanceQuery : Fluents.Queries.IWitResponse<AccountBalanceDto>
{
    public required Guid Id { get; init; }
}

internal sealed class GetAccountBalanceQueryHandler
    : Fluents.Queries.IHandler<GetAccountBalanceQuery, AccountBalanceDto>
{
    public Task<AccountBalanceDto?> OnHandle(GetAccountBalanceQuery request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
