using X.PagedList;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Postings.V1.Specs;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.AppServices.Accounts.V1.Queries;

/// <summary>
/// A date-bounded, paged read of an account's postings in stream order (never effective-date order — a
/// backdated posting is returned at the position it was recorded at).
/// </summary>
public sealed record GetAccountStatementQuery : Fluents.Queries.IWitPageResponse<PostingDto>
{
    public const int DefaultPageIndex = 1;
    public const int DefaultPageSize = 20;

    public required Guid AccountId { get; init; }

    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }

    public int? PageIndex { get; init; }

    public int? PageSize { get; init; }
}

/// <summary>
/// Offset paging (page index/size), the same convention <see cref="ListAccountsQuery"/> already uses — pages
/// partition <see cref="Posting.StreamPosition"/> order exactly under a stable sort, and a page past the end
/// of the stream comes back as an empty page rather than an error (<c>X.PagedList</c>'s own behavior for an
/// out-of-range page number).
/// </summary>
internal sealed class GetAccountStatementQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IPageHandler<GetAccountStatementQuery, PostingDto>
{
    public Task<IPagedList<PostingDto>> OnHandle(
        GetAccountStatementQuery request,
        CancellationToken cancellationToken) =>
        repository.ToPagedListAsync<Posting, PostingDto>(
            new SpecListPostingsForStatement(request.AccountId, request.From, request.To),
            request.PageIndex ?? GetAccountStatementQuery.DefaultPageIndex,
            request.PageSize ?? GetAccountStatementQuery.DefaultPageSize,
            cancellationToken);
}
