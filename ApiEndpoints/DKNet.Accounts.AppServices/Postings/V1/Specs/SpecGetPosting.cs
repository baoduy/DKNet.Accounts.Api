using System.ComponentModel;
using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.AppServices.Postings.V1.Specs;

internal sealed class SpecGetPosting : Specification<Posting>
{
    public SpecGetPosting(
        Guid? byId = null,
        Guid? byAccountIdAndPosition = null,
        long? position = null,
        string? byCallingSystem = null,
        string? byIdempotencyKey = null)
    {
        var predicate = CreatePredicate();

        if (byId is not null)
        {
            predicate = predicate.And(p => p.Id == byId);
        }

        if (byAccountIdAndPosition is not null && position is not null)
        {
            predicate = predicate.And(p => p.AccountId == byAccountIdAndPosition && p.StreamPosition == position);
        }

        if (byCallingSystem is not null && byIdempotencyKey is not null)
        {
            predicate = predicate.And(p => p.CallingSystem == byCallingSystem && p.IdempotencyKey == byIdempotencyKey);
        }

        if (byId is null && byCallingSystem is null)
        {
            predicate = predicate.And(_ => true);
        }

        WithFilter(predicate);
    }
}

internal sealed class SpecListPostingsByTransactionGroup : Specification<Posting>
{
    public SpecListPostingsByTransactionGroup(Guid transactionGroupId)
    {
        WithFilter(p => p.TransactionGroupId == transactionGroupId);
        AddOrderBy(p => p.StreamPosition);
    }
}

/// <summary>An account's postings, date-bounded on <see cref="Posting.EffectiveDate"/> and ordered by
/// <see cref="Posting.StreamPosition"/> — recording order, never effective-date order (a backdated posting is
/// read at the position it was recorded at).</summary>
internal sealed class SpecListPostingsForStatement : Specification<Posting>
{
    public SpecListPostingsForStatement(Guid accountId, DateOnly? from, DateOnly? to)
    {
        var predicate = CreatePredicate(p => p.AccountId == accountId);

        if (from is not null)
        {
            predicate = predicate.And(p => p.EffectiveDate >= from);
        }

        if (to is not null)
        {
            predicate = predicate.And(p => p.EffectiveDate <= to);
        }

        WithFilter(predicate);
        AddOrderBy(p => p.StreamPosition);
    }
}

/// <summary>Field names <see cref="SpecListPostings"/>' <c>orderBy</c> may sort by — every entry is a real,
/// mapped <see cref="Posting"/> column (R3), keyed case-insensitively so a caller's casing never matters.
/// Shared by <c>ListPostingsQueryValidator</c> (which refuses an unknown field, R2) and the query handler
/// (which resolves the caller's casing to the entity's own before handing it to <c>AddOrderBy(string, ...)</c>).</summary>
internal static class PostingListOrderFields
{
    private static readonly IReadOnlyDictionary<string, string> Fields =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [nameof(Posting.EffectiveDate)] = nameof(Posting.EffectiveDate),
            [nameof(Posting.Amount)] = nameof(Posting.Amount),
            [nameof(Posting.PostingNumber)] = nameof(Posting.PostingNumber),
            [nameof(Posting.RecordedAt)] = nameof(Posting.RecordedAt),
            [nameof(Posting.StreamPosition)] = nameof(Posting.StreamPosition)
        };

    public static bool TryResolve(string field, out string resolved) => Fields.TryGetValue(field, out resolved!);
}

/// <summary>Cross-account posting list (DRK-1659 §5): every posting inside a required effective-date window,
/// optionally narrowed to one account, direction, category or status, and optionally searched over the
/// reference-carrying text fields (<see cref="Posting.PostingNumber"/>, <see cref="Posting.CounterpartyReference"/>,
/// <see cref="Posting.Description"/>) — every one a real, mapped column (R3). Ordered by
/// <see cref="Posting.StreamPosition"/> unless <c>orderBy</c> names a different
/// <see cref="PostingListOrderFields"/> entry.</summary>
internal sealed class SpecListPostings : Specification<Posting>
{
    public SpecListPostings(
        DateOnly from, DateOnly to, Guid? accountId,
        PostingDirection? direction, PostingCategory? category, PostingStatus? status,
        string? search, string? orderBy, bool desc)
    {
        var predicate = CreatePredicate(p => p.EffectiveDate >= from && p.EffectiveDate <= to);

        if (accountId is not null)
        {
            predicate = predicate.And(p => p.AccountId == accountId);
        }

        if (direction is not null)
        {
            predicate = predicate.And(p => p.Direction == direction);
        }

        if (category is not null)
        {
            predicate = predicate.And(p => p.Category == category);
        }

        if (status is not null)
        {
            predicate = predicate.And(p => p.Status == status);
        }

        if (!string.IsNullOrEmpty(search))
        {
            predicate = predicate.And(p =>
                (p.PostingNumber != null && p.PostingNumber.Contains(search)) ||
                (p.CounterpartyReference != null && p.CounterpartyReference.Contains(search)) ||
                (p.Description != null && p.Description.Contains(search)));
        }

        WithFilter(predicate);

        if (string.IsNullOrEmpty(orderBy))
        {
            AddOrderBy(p => p.StreamPosition);
        }
        else
        {
            AddOrderBy(orderBy, desc ? ListSortDirection.Descending : ListSortDirection.Ascending);
        }
    }
}
