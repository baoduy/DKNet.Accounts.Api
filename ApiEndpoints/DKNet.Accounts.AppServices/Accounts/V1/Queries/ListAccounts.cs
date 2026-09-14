using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
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

internal sealed class ListAccountsQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IPageHandler<ListAccountsQuery, AccountDto>
{
    public Task<IPagedList<AccountDto>> OnHandle(ListAccountsQuery request, CancellationToken cancellationToken) =>
        repository.ToPagedListAsync<Account, AccountDto>(
            new SpecListAccounts(request.GroupId, request.Currency, request.Status),
            request.PageIndex ?? ListAccountsQuery.DefaultPageIndex,
            request.PageSize ?? ListAccountsQuery.DefaultPageSize,
            cancellationToken);
}
