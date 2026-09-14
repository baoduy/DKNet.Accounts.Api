using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using X.PagedList;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Queries;

public sealed record ListAccountGroupsQuery : Fluents.Queries.IWitPageResponse<AccountGroupDto>
{
    public const int DefaultPageIndex = 1;
    public const int DefaultPageSize = 20;

    public string? Code { get; init; }

    public AccountGroupType? Type { get; init; }

    public AccountGroupStatus? Status { get; init; }

    public Guid? ParentId { get; init; }

    public int? PageIndex { get; init; }

    public int? PageSize { get; init; }
}

internal sealed class ListAccountGroupsQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IPageHandler<ListAccountGroupsQuery, AccountGroupDto>
{
    public Task<IPagedList<AccountGroupDto>> OnHandle(
        ListAccountGroupsQuery request,
        CancellationToken cancellationToken) =>
        repository.ToPagedListAsync<AccountGroup, AccountGroupDto>(
            new SpecListAccountGroups(
                request.Type,
                request.Status,
                request.ParentId,
                request.Code),
            request.PageIndex ?? ListAccountGroupsQuery.DefaultPageIndex,
            request.PageSize ?? ListAccountGroupsQuery.DefaultPageSize,
            cancellationToken);
}
