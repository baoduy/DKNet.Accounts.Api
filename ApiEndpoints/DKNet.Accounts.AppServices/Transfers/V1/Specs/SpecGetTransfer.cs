using System.ComponentModel;
using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Domains.Features.Transfers.Entities;

namespace DKNet.Accounts.AppServices.Transfers.V1.Specs;

/// <summary>One transfer, by id or by the (calling system, idempotency key) it was recorded under. The key is
/// stored lowercased and the request lowercases its own, so a plain comparison is enough.</summary>
internal sealed class SpecGetTransfer : Specification<Transfer>
{
    public SpecGetTransfer(Guid id) => WithFilter(t => t.Id == id);

    public SpecGetTransfer(string callingSystem, string idempotencyKey) =>
        WithFilter(t => t.CallingSystem == callingSystem && t.IdempotencyKey == idempotencyKey);
}

/// <summary>The postings a transfer recorded (DRK-2276 R8): its transaction group without any later reversal,
/// in posting-number order.</summary>
internal sealed class SpecListTransferPostings : Specification<Posting>
{
    public SpecListTransferPostings(Guid transferId)
    {
        WithFilter(p => p.TransactionGroupId == transferId && p.ReversesPostingId == null);
        AddOrderBy(p => p.PostingNumber);
    }
}

/// <summary>Field names <see cref="SpecListAccountTransfers"/>' <c>orderBy</c> may sort by (DRK-2300 §3a), keyed
/// case-insensitively and resolved to the entity's own names. Shared by <c>ListAccountTransfersQueryValidator</c>
/// (which refuses an unknown field) and the query handler.</summary>
internal static class TransferListOrderFields
{
    private static readonly IReadOnlyDictionary<string, string> Fields =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [nameof(Transfer.RecordedAt)] = nameof(Transfer.RecordedAt),
            [nameof(Transfer.Amount)] = nameof(Transfer.Amount),
            [nameof(Transfer.ConvertedAmount)] = nameof(Transfer.ConvertedAmount),
            [nameof(Transfer.Fee)] = nameof(Transfer.Fee)
        };

    public static bool TryResolve(string field, out string resolved) => Fields.TryGetValue(field, out resolved!);
}

/// <summary>The transfers one account is the source, destination or fee account of (R1), recorded inside the UTC
/// days <c>from</c> to <c>to</c> (R3), optionally searched over the idempotency key and the
/// calling system without regard to case (R4). Newest first unless <c>orderBy</c> names a
/// <see cref="TransferListOrderFields"/> entry, and always by id last so a page boundary
/// never splits equal values differently between pages (R5).</summary>
internal sealed class SpecListAccountTransfers : Specification<Transfer>
{
    public SpecListAccountTransfers(
        Guid accountId, DateOnly from, DateOnly to, string? search, string? orderBy, bool desc)
    {
        var start = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var predicate = CreatePredicate(t =>
            (t.SourceAccountId == accountId || t.DestinationAccountId == accountId || t.FeeAccountId == accountId)
            && t.RecordedAt >= start);

        // The last day has no next day to stop before; every moment from its start on is inside.
        if (to < DateOnly.MaxValue)
        {
            var end = new DateTimeOffset(to.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            predicate = predicate.And(t => t.RecordedAt < end);
        }

        if (!string.IsNullOrEmpty(search))
        {
            // ToLower() is the form the PostgreSQL and SQL Server providers translate to LOWER(), so the culture
            // analyzers that ask for a culture-aware overload are suppressed here: the comparison runs in the
            // database (as SpecGetPosting does).
            var term = search.ToLowerInvariant();
#pragma warning disable CA1304, CA1311, CA1862
            predicate = predicate.And(t =>
                t.IdempotencyKey.ToLower().Contains(term) || t.CallingSystem.ToLower().Contains(term));
#pragma warning restore CA1304, CA1311, CA1862
        }

        WithFilter(predicate);

        if (string.IsNullOrEmpty(orderBy))
        {
            AddOrderByDescending(t => t.RecordedAt);
        }
        else
        {
            AddOrderBy(orderBy, desc ? ListSortDirection.Descending : ListSortDirection.Ascending);
        }

        AddOrderBy(t => t.Id);
    }
}
