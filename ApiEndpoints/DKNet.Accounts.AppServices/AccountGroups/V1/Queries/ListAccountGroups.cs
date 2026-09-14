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

internal sealed class ListAccountGroupsQueryHandler
    : Fluents.Queries.IPageHandler<ListAccountGroupsQuery, AccountGroupDto>
{
    public Task<IPagedList<AccountGroupDto>> OnHandle(
        ListAccountGroupsQuery request,
        CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
