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
