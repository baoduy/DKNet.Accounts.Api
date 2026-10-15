using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.Domains.Features.Transfers.Entities;

/// <summary>
/// One money movement from a source account to a different destination account, with an optional currency
/// conversion and a fee taken out of the amount (DRK-2276). Accounts are referenced by id only (DKNET-AGG-004).
/// <see cref="DomainEntity.Id"/> is also the transaction group of every posting the transfer recorded. Never
/// updated after it is recorded, and it raises no event of its own: each of its postings raises
/// <c>postings.created</c>.
/// </summary>
public sealed class Transfer : AggregateRoot
{
    #region Constructors

    public Transfer(
        Guid sourceAccountId,
        Guid destinationAccountId,
        decimal amount,
        string sourceCurrency,
        string destinationCurrency,
        decimal? exchangeRate,
        decimal fee,
        Guid? feeAccountId,
        decimal convertedAmount,
        DateTimeOffset recordedAt,
        string callingSystem,
        string idempotencyKey)
    {
        SourceAccountId = sourceAccountId;
        DestinationAccountId = destinationAccountId;
        Amount = amount;
        SourceCurrency = sourceCurrency;
        DestinationCurrency = destinationCurrency;
        ExchangeRate = exchangeRate;
        Fee = fee;
        FeeAccountId = feeAccountId;
        ConvertedAmount = convertedAmount;
        RecordedAt = recordedAt;
        CallingSystem = callingSystem;
        IdempotencyKey = idempotencyKey;
    }

    private Transfer()
    {
    }

    #endregion

    #region Properties

    public Guid SourceAccountId { get; private set; }

    public Guid DestinationAccountId { get; private set; }

    /// <summary>The total taken from the source, fee included, in <see cref="SourceCurrency"/>.</summary>
    public decimal Amount { get; private set; }

    public string SourceCurrency { get; private set; } = null!;

    public string DestinationCurrency { get; private set; } = null!;

    /// <summary>Destination units per 1 source unit; null when both currencies are the same.</summary>
    public decimal? ExchangeRate { get; private set; }

    /// <summary>In <see cref="SourceCurrency"/>; 0 when no fee was taken.</summary>
    public decimal Fee { get; private set; }

    /// <summary>Set only when <see cref="Fee"/> is above 0.</summary>
    public Guid? FeeAccountId { get; private set; }

    /// <summary>What the destination was credited, in <see cref="DestinationCurrency"/>.</summary>
    public decimal ConvertedAmount { get; private set; }

    public DateTimeOffset RecordedAt { get; private set; }

    /// <summary>Always taken from the credential, never from the request body.</summary>
    public string CallingSystem { get; private set; } = null!;

    public string IdempotencyKey { get; private set; } = null!;

    #endregion
}
