using X.PagedList;

namespace DKNet.Accounts.AppServices.Postings.V1.Queries;

/// <summary>
/// Cross-account posting list (DRK-1659 §5): a required effective-date window of at most 90 days,
/// optionally narrowed to one account, with the same filter/search/order/page surface the generated list
/// routes already offer over <see cref="PostingDto"/>. Build implements the refusal rules (R1/R2) and the
/// query itself; this stage only carries the signature the acceptance tests compile against.
/// </summary>
public sealed record ListPostingsQuery : Fluents.Queries.IWitPageResponse<PostingDto>
{
    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }

    public Guid? AccountId { get; init; }

    public string? Direction { get; init; }

    public string? Category { get; init; }

    public string? Status { get; init; }

    public string? Search { get; init; }

    public string? OrderBy { get; init; }

    public bool Desc { get; init; }

    public int? PageNumber { get; init; }

    public int? PageSize { get; init; }
}

internal sealed class ListPostingsQueryHandler : Fluents.Queries.IPageHandler<ListPostingsQuery, PostingDto>
{
    public Task<IPagedList<PostingDto>> OnHandle(ListPostingsQuery request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
