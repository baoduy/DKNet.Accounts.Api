using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.AppServices.Postings.V1;

public sealed record PostingDto
{
    public Guid Id { get; init; }

    public string PostingNumber { get; init; } = null!;

    public Guid AccountId { get; init; }

    public long StreamPosition { get; init; }

    public PostingDirection Direction { get; init; }

    public decimal Amount { get; init; }

    public string Currency { get; init; } = null!;

    public decimal SignedAmount { get; init; }

    public decimal BalanceAfter { get; init; }

    public DateOnly EffectiveDate { get; init; }

    public DateTimeOffset RecordedAt { get; init; }

    public PostingCategory Category { get; init; }

    public PostingStatus Status { get; init; }

    public Guid? ReversesPostingId { get; init; }

    public Guid? ReversedByPostingId { get; init; }

    public Guid? TransactionGroupId { get; init; }

    public Guid? CounterpartyAccountId { get; init; }

    public string? CounterpartyReference { get; init; }

    public string CallingSystem { get; init; } = null!;

    public string? IdempotencyKey { get; init; }

    public string? ExternalReference { get; init; }

    public string? Description { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}
