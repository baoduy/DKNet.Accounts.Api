using X.PagedList;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Transfers.V1.Specs;
using DKNet.Accounts.Domains.Features.Transfers.Entities;

namespace DKNet.Accounts.AppServices.Transfers.V1.Queries;

/// <summary>
/// The transfers of one account (DRK-2300 §5): every transfer the account is the source, destination or fee
/// account of, inside a UTC recorded-date window of at most 1 year, searchable, sortable and paged. The endpoint
/// fills a missing <see cref="To"/> with today's UTC date; a missing <see cref="From"/> stays null here and means
/// 1 year before <see cref="To"/>.
/// </summary>
public sealed record ListAccountTransfersQuery : Fluents.Queries.IWitPageResponse<TransferRowDto>
{
    public Guid AccountId { get; init; }

    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }

    public string? Search { get; init; }

    public string? OrderBy { get; init; }

    public bool Desc { get; init; }

    public int? PageNumber { get; init; }

    public int? PageSize { get; init; }
}

/// <summary>The window, page number and page size rules of the list (R2, R6), shared by the validator and the
/// handler.</summary>
internal static class AccountTransferListArguments
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 1000;

    /// <summary>R2: a missing <paramref name="from"/> is 1 year before <paramref name="to"/> and always valid. A
    /// sent one is refused (null) when <paramref name="to"/> is before it or more than 1 year after it — a year
    /// from 29 February ends on 28 February.</summary>
    public static (DateOnly From, DateOnly To)? Window(DateOnly? from, DateOnly to)
    {
        if (from is not { } sent)
        {
            return (to.Year > DateOnly.MinValue.Year ? to.AddYears(-1) : DateOnly.MinValue, to);
        }

        // No date is more than 1 year after a date in the last year DateOnly holds.
        var tooLong = sent.Year < DateOnly.MaxValue.Year && to > sent.AddYears(1);
        return to < sent || tooLong ? null : (sent, to);
    }

    /// <summary>R6: below 1 or missing reads page 1.</summary>
    public static int PageNumber(int? pageNumber) => pageNumber is > 0 ? pageNumber.Value : 1;

    /// <summary>R6: below 1 or missing reads 20 per page; above 1000 reads 1000.</summary>
    public static int PageSize(int? pageSize) => pageSize is > 0 ? Math.Min(pageSize.Value, MaxPageSize) : DefaultPageSize;
}

/// <summary>R2: a window <see cref="AccountTransferListArguments.Window"/> refuses is refused
/// <see cref="LedgerErrors.InvalidDateRange"/> (422). R4/R5: a search term under 2 characters or an
/// <c>orderBy</c> outside <see cref="TransferListOrderFields"/> is refused with no code (400).</summary>
internal sealed class ListAccountTransfersQueryValidator : AbstractValidator<ListAccountTransfersQuery>
{
    public ListAccountTransfersQueryValidator()
    {
        RuleFor(q => q)
            .Must(q => q.To is { } to && AccountTransferListArguments.Window(q.From, to) is not null)
            .WithErrorCode(LedgerErrors.InvalidDateRange)
            .WithMessage("The recorded-date window must have 'to' on or after 'from' and at most 1 year after it.");

        RuleFor(q => q.Search)
            .MinimumLength(2)
            .When(q => !string.IsNullOrEmpty(q.Search))
            .WithMessage("A search term must be at least 2 characters.");

        RuleFor(q => q.OrderBy)
            .Must(field => TransferListOrderFields.TryResolve(field!, out _))
            .When(q => !string.IsNullOrEmpty(q.OrderBy))
            .WithMessage(q => $"'{q.OrderBy}' is not a field transfers can be ordered by.");
    }
}

internal sealed class ListAccountTransfersQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IPageHandler<ListAccountTransfersQuery, TransferRowDto>
{
    public async Task<IPagedList<TransferRowDto>> OnHandle(
        ListAccountTransfersQuery request, CancellationToken cancellationToken)
    {
        var (from, to) = AccountTransferListArguments.Window(request.From, request.To!.Value)!.Value;
        string? orderBy = null;
        if (!string.IsNullOrEmpty(request.OrderBy))
        {
            TransferListOrderFields.TryResolve(request.OrderBy, out orderBy);
        }

        var spec = new SpecListAccountTransfers(request.AccountId, from, to, request.Search, orderBy, request.Desc);
        var page = await repository.ToPagedListAsync<Transfer, TransferRowDto>(
            spec,
            AccountTransferListArguments.PageNumber(request.PageNumber),
            AccountTransferListArguments.PageSize(request.PageSize),
            cancellationToken);

        // R7: the rate in the form reading one transfer writes it (TransferReading.ToDtoAsync), not PostgreSQL's
        // numeric(18,8) form — dividing by a 1 of scale 28 drops every trailing zero (0.74000000 → 0.74).
        return new StaticPagedList<TransferRowDto>(
            page.Select(row => row with { ExchangeRate = row.ExchangeRate / 1.0000000000000000000000000000m }),
            page.GetMetaData());
    }
}
