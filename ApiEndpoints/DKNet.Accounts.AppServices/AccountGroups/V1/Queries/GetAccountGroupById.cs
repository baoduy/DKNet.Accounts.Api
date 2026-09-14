namespace DKNet.Accounts.AppServices.AccountGroups.V1.Queries;

public sealed record GetAccountGroupByIdQuery : Fluents.Queries.IWitResponse<AccountGroupDto>
{
    public required Guid Id { get; init; }
}

internal sealed class GetAccountGroupByIdQueryHandler
    : Fluents.Queries.IHandler<GetAccountGroupByIdQuery, AccountGroupDto>
{
    public Task<AccountGroupDto?> OnHandle(GetAccountGroupByIdQuery request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
