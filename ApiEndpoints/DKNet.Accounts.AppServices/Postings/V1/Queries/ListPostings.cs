using X.PagedList;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Postings.V1.Specs;
using DKNet.Accounts.Domains.Features.Postings.Entities;

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

/// <summary>R1: a missing bound, a span over 90 days, or <c>To</c> before <c>From</c> is refused
/// <see cref="LedgerErrors.InvalidDateRange"/> (422). R2: a search term under 2 characters, or an
/// <c>orderBy</c>/<c>direction</c>/<c>category</c>/<c>status</c> value the query surface doesn't recognise, is
/// refused with no code (400) — never silently ignored.</summary>
internal sealed class ListPostingsQueryValidator : AbstractValidator<ListPostingsQuery>
{
    public ListPostingsQueryValidator()
    {
        RuleFor(q => q)
            .Must(q => q.From is not null && q.To is not null && q.To >= q.From &&
                       q.To.Value.DayNumber - q.From.Value.DayNumber <= 90)
            .WithErrorCode(LedgerErrors.InvalidDateRange)
            .WithMessage("The effective-date window must carry both bounds, with 'to' on or after 'from' and at most 90 days apart.");

        RuleFor(q => q.Search)
            .MinimumLength(2)
            .When(q => !string.IsNullOrEmpty(q.Search))
            .WithMessage("A search term must be at least 2 characters.");

        RuleFor(q => q.OrderBy)
            .Must(field => PostingListOrderFields.TryResolve(field!, out _))
            .When(q => !string.IsNullOrEmpty(q.OrderBy))
            .WithMessage(q => $"'{q.OrderBy}' is not a field postings can be ordered by.");

        RuleFor(q => q.Direction)
            .Must(value => Enum.TryParse<PostingDirection>(value, ignoreCase: true, out _))
            .When(q => q.Direction is not null)
            .WithMessage(q => $"'{q.Direction}' is not a known posting direction.");

        RuleFor(q => q.Category)
            .Must(value => Enum.TryParse<PostingCategory>(value, ignoreCase: true, out _))
            .When(q => q.Category is not null)
            .WithMessage(q => $"'{q.Category}' is not a known posting category.");

        RuleFor(q => q.Status)
            .Must(value => Enum.TryParse<PostingStatus>(value, ignoreCase: true, out _))
            .When(q => q.Status is not null)
            .WithMessage(q => $"'{q.Status}' is not a known posting status.");
    }
}

internal sealed class ListPostingsQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IPageHandler<ListPostingsQuery, PostingDto>
{
    private const int DefaultPageIndex = 1;
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 1000;

    public Task<IPagedList<PostingDto>> OnHandle(ListPostingsQuery request, CancellationToken cancellationToken)
    {
        string? orderByField = null;
        if (!string.IsNullOrEmpty(request.OrderBy))
        {
            PostingListOrderFields.TryResolve(request.OrderBy, out orderByField);
        }

        var spec = new SpecListPostings(
            request.From!.Value,
            request.To!.Value,
            request.AccountId,
            request.Direction is null ? null : Enum.Parse<PostingDirection>(request.Direction, ignoreCase: true),
            request.Category is null ? null : Enum.Parse<PostingCategory>(request.Category, ignoreCase: true),
            request.Status is null ? null : Enum.Parse<PostingStatus>(request.Status, ignoreCase: true),
            request.Search,
            orderByField,
            request.Desc);

        var pageIndex = request.PageNumber ?? DefaultPageIndex;
        var pageSize = Math.Min(request.PageSize ?? DefaultPageSize, MaxPageSize);

        return repository.ToPagedListAsync<Posting, PostingDto>(spec, pageIndex, pageSize, cancellationToken);
    }
}
