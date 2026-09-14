using X.PagedList;

namespace DKNet.Accounts.AppServices.Accounts.V1.Queries;

public sealed record ListAccountsQuery : Fluents.Queries.IWitPageResponse<AccountDto>
{
    public const int DefaultPageIndex = 1;
    public const int DefaultPageSize = 20;

    public Guid? GroupId { get; init; }

    public AccountStatus? Status { get; init; }

    public string? Currency { get; init; }

    public int? PageIndex { get; init; }

    public int? PageSize { get; init; }
}

internal sealed class ListAccountsQueryHandler : Fluents.Queries.IPageHandler<ListAccountsQuery, AccountDto>
{
    public Task<IPagedList<AccountDto>> OnHandle(ListAccountsQuery request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
