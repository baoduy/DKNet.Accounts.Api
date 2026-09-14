using X.PagedList;
using DKNet.Accounts.AppServices.Postings.V1;

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

internal sealed class GetAccountStatementQueryHandler
    : Fluents.Queries.IPageHandler<GetAccountStatementQuery, PostingDto>
{
    public Task<IPagedList<PostingDto>> OnHandle(
        GetAccountStatementQuery request,
        CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
