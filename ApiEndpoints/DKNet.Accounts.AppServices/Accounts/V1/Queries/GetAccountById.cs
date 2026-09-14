namespace DKNet.Accounts.AppServices.Accounts.V1.Queries;

public sealed record GetAccountByIdQuery : Fluents.Queries.IWitResponse<AccountDto>
{
    public required Guid Id { get; init; }
}

internal sealed class GetAccountByIdQueryHandler : Fluents.Queries.IHandler<GetAccountByIdQuery, AccountDto>
{
    public Task<AccountDto?> OnHandle(GetAccountByIdQuery request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
