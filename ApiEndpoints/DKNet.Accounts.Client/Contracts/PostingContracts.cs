namespace DKNet.Accounts.Client.Contracts;

/// <summary>Mirrors the service's <c>RecordPostingRequest</c>, minus <c>IdempotencyKey</c> — that value is
/// an ordinary method argument on <see cref="Client.IAccountClient.RecordPostingAsync"/>, not a body field
/// (spec §3 row 7).</summary>
public sealed record RecordPostingRequest
{
    public required Guid AccountId { get; init; }

    public required PostingDirection Direction { get; init; }

    public required decimal Amount { get; init; }

    public required string Currency { get; init; }

    public DateOnly? EffectiveDate { get; init; }

    public required PostingCategory Category { get; init; }

    public string? Description { get; init; }

    public Guid? CounterpartyAccountId { get; init; }

    public string? CounterpartyReference { get; init; }

    public Guid? TransactionGroupId { get; init; }

    public string? ExternalReference { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}

/// <summary>Mirrors the service's <c>PostingBatchMovement</c>.</summary>
public sealed record PostingBatchMovement
{
    public required Guid AccountId { get; init; }

    public required PostingDirection Direction { get; init; }

    public required decimal Amount { get; init; }

    public required string Currency { get; init; }

    public DateOnly? EffectiveDate { get; init; }

    public required PostingCategory Category { get; init; }

    public string? Description { get; init; }

    public Guid? CounterpartyAccountId { get; init; }

    public string? CounterpartyReference { get; init; }

    public string? ExternalReference { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}

/// <summary>Mirrors the service's <c>RecordPostingBatchRequest</c>, minus <c>IdempotencyKey</c> (see
/// <see cref="RecordPostingRequest"/>'s remark — the same rule applies to
/// <see cref="Client.IAccountClient.RecordPostingBatchAsync"/>).</summary>
public sealed record RecordPostingBatchRequest
{
    public required IReadOnlyList<PostingBatchMovement> Movements { get; init; }

    public Guid? TransactionGroupId { get; init; }
}

/// <summary>Mirrors the service's <c>PostingDto</c>.</summary>
public sealed record PostingDto
{
    public required Guid Id { get; init; }

    public required Guid AccountId { get; init; }

    public required string PostingNumber { get; init; }

    public long StreamPosition { get; init; }

    public required PostingDirection Direction { get; init; }

    public decimal Amount { get; init; }

    public required string Currency { get; init; }

    public required decimal SignedAmount { get; init; }

    public decimal BalanceAfter { get; init; }

    public DateOnly EffectiveDate { get; init; }

    public DateTimeOffset RecordedAt { get; init; }

    public PostingCategory Category { get; init; }

    public PostingStatus Status { get; init; }

    public Guid? ReversedByPostingId { get; init; }

    public Guid? ReversesPostingId { get; init; }

    public Guid? TransactionGroupId { get; init; }

    public Guid? CounterpartyAccountId { get; init; }

    public string? CounterpartyReference { get; init; }

    public string? CallingSystem { get; init; }

    /// <summary>The idempotency key this posting was recorded with, if any — read-only here; sending one is
    /// an ordinary method argument, never a body field (spec §3 row 7).</summary>
    public string? IdempotencyKey { get; init; }

    public string? ExternalReference { get; init; }

    public string? Description { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}
