using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.Domains.Features.Postings.Entities;

public enum PostingDirection
{
    Credit,
    Debit
}

public enum PostingCategory
{
    Transfer,
    Payment,
    Fee,
    Interest,
    Adjustment,
    Refund,
    Reversal,
    OpeningBalance
}

public enum PostingStatus
{
    Posted,
    Reversed
}

/// <summary>
/// One credit or debit recorded against an <c>Account</c> (referenced by id only — DKNET-AGG-004), at its
/// gapless, unique-per-account stream position (always recording order, never effective-date order). Append
/// only: the sole state transition after creation is the one-way <see cref="MarkReversedBy"/>, applied at most
/// once (DRK-1242 §"Correcting and reading the ledger").
/// </summary>
public sealed class Posting : AggregateRoot
{
    #region Constructors

    public Posting(
        Guid accountId,
        string postingNumber,
        long streamPosition,
        PostingDirection direction,
        decimal amount,
        string currency,
        decimal signedValue,
        decimal balanceAfter,
        DateOnly effectiveDate,
        DateTimeOffset recordedAt,
        PostingCategory category,
        Guid? transactionGroupId,
        Guid? counterpartyAccountId,
        string? counterpartyReference,
        string callingSystem,
        string? idempotencyKey,
        string? idempotencySignature,
        string? externalReference,
        string? description,
        IReadOnlyDictionary<string, string>? metadata,
        string byUser)
        : base(byUser)
    {
        AccountId = accountId;
        PostingNumber = postingNumber;
        StreamPosition = streamPosition;
        Direction = direction;
        Amount = amount;
        Currency = currency;
        SignedValue = signedValue;
        BalanceAfter = balanceAfter;
        EffectiveDate = effectiveDate;
        RecordedAt = recordedAt;
        Category = category;
        Status = PostingStatus.Posted;
        TransactionGroupId = transactionGroupId;
        CounterpartyAccountId = counterpartyAccountId;
        CounterpartyReference = counterpartyReference;
        CallingSystem = callingSystem;
        IdempotencyKey = idempotencyKey;
        IdempotencySignature = idempotencySignature;
        ExternalReference = externalReference;
        Description = description;
        Metadata = metadata;
    }

    private Posting()
    {
    }

    #endregion

    #region Properties

    public Guid AccountId { get; private set; }

    public string PostingNumber { get; private set; } = null!;

    /// <summary>This posting's position in its account's stream — gapless, unique per account, always
    /// assigned in recording order (never effective-date order, R.. backdated posting).</summary>
    public long StreamPosition { get; private set; }

    public PostingDirection Direction { get; private set; }

    public decimal Amount { get; private set; }

    public string Currency { get; private set; } = null!;

    /// <summary>Amount signed by this account's accounting classification: positive when this posting
    /// increased <see cref="BalanceAfter"/>'s predecessor, negative when it decreased it.</summary>
    public decimal SignedValue { get; private set; }

    public decimal BalanceAfter { get; private set; }

    /// <summary>Defaults to the recording date; never later than it without refusal (EFFECTIVE_DATE_IN_FUTURE)
    /// — a backdated (earlier) value is accepted but never changes <see cref="StreamPosition"/>.</summary>
    public DateOnly EffectiveDate { get; private set; }

    public DateTimeOffset RecordedAt { get; private set; }

    public PostingCategory Category { get; private set; }

    public PostingStatus Status { get; private set; }

    /// <summary>Set on the original posting once <see cref="MarkReversedBy"/> runs; null until then.</summary>
    public Guid? ReversedByPostingId { get; private set; }

    /// <summary>Set only on a reversal posting itself — the original posting it reverses.</summary>
    public Guid? ReversesPostingId { get; private set; }

    /// <summary>Ties every leg of one batch (or a single posting's own id-less group) together — one shared
    /// value per batch (DRK-1242 §"A transfer batch records both legs under one transaction group").</summary>
    public Guid? TransactionGroupId { get; private set; }

    public Guid? CounterpartyAccountId { get; private set; }

    public string? CounterpartyReference { get; private set; }

    /// <summary>The identity of the system that recorded this posting (R5) — always taken from the
    /// credential, never trusted from a request body field of the same name.</summary>
    public string CallingSystem { get; private set; } = null!;

    public string? IdempotencyKey { get; private set; }

    /// <summary>Internal-only fingerprint of this request's meaningful content, scoped to
    /// (<see cref="CallingSystem"/>, <see cref="IdempotencyKey"/>) — compared against a repeat request's own
    /// signature to tell "the same request, replayed" from "a different request reusing the same key" (never
    /// exposed on the API contract).</summary>
    public string? IdempotencySignature { get; private set; }

    public string? ExternalReference { get; private set; }

    public string? Description { get; private set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; private set; }

    #endregion

    #region Methods

    /// <summary>
    /// One-way transition: marks this posting reversed and links to the posting that reversed it. Throws if
    /// called on an already-reversed posting — the handler must check <see cref="Status"/> itself (while
    /// holding the account's lock) so a refusal surfaces as a business-rule result, not this exception; this
    /// is the last line of defence against applying a reversal twice.
    /// </summary>
    public void MarkReversedBy(Guid reversalPostingId, string userId)
    {
        if (Status == PostingStatus.Reversed)
        {
            throw new InvalidOperationException($"Posting {Id} has already been reversed.");
        }

        Status = PostingStatus.Reversed;
        ReversedByPostingId = reversalPostingId;
        SetUpdatedBy(userId);
    }

    /// <summary>Links this (newly-constructed) posting back to the original it reverses. Called once, right
    /// after construction, by the handler that builds the reversal posting.</summary>
    public void LinkAsReversalOf(Guid originalPostingId)
    {
        ReversesPostingId = originalPostingId;
    }

    /// <summary>Stamps this (newly-constructed, not-yet-persisted) posting as the one carrying its batch's
    /// idempotency key — a batch's key/signature live on one leg only, since the DB unique index on
    /// (CallingSystem, IdempotencyKey) allows one row per key. Called once, right after construction, before
    /// the posting is added to the repository.</summary>
    public void StampIdempotency(string idempotencyKey, string signature)
    {
        IdempotencyKey = idempotencyKey;
        IdempotencySignature = signature;
    }

    #endregion
}
