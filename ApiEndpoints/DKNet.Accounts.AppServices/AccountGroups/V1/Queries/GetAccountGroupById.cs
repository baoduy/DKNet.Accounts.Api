using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Queries;

public sealed record GetAccountGroupByIdQuery : Fluents.Queries.IWitResponse<AccountGroupDto>
{
    public required Guid Id { get; init; }
}

internal sealed class GetAccountGroupByIdQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IHandler<GetAccountGroupByIdQuery, AccountGroupDto>
{
    public Task<AccountGroupDto?> OnHandle(GetAccountGroupByIdQuery request, CancellationToken cancellationToken) =>
        repository.FirstOrDefaultAsync<AccountGroup, AccountGroupDto>(
            new SpecGetAccountGroup(request.Id), cancellationToken);
}
