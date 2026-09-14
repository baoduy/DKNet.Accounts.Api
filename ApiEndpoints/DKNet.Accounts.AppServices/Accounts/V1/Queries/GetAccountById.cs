using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.AppServices.Accounts.V1.Queries;

public sealed record GetAccountByIdQuery : Fluents.Queries.IWitResponse<AccountDto>
{
    public required Guid Id { get; init; }
}

internal sealed class GetAccountByIdQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IHandler<GetAccountByIdQuery, AccountDto>
{
    public Task<AccountDto?> OnHandle(GetAccountByIdQuery request, CancellationToken cancellationToken) =>
        repository.FirstOrDefaultAsync<Account, AccountDto>(new SpecGetAccount(request.Id), cancellationToken);
}
