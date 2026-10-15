namespace DKNet.Accounts.Client.Contracts;

/// <summary>Mirrors the service's <c>RecordTransferRequest</c>, minus <c>IdempotencyKey</c> — that value is an
/// ordinary method argument on <see cref="Client.IAccountClient.RecordTransferAsync"/>, not a body field.</summary>
public sealed record RecordTransferRequest
{
    public required Guid SourceAccountId { get; init; }

    public required Guid DestinationAccountId { get; init; }

    public required decimal Amount { get; init; }

    public required string SourceCurrency { get; init; }

    public required string DestinationCurrency { get; init; }

    /// <summary>Destination units per 1 source unit. Sent only when the currencies differ.</summary>
    public decimal? ExchangeRate { get; init; }

    public required decimal Fee { get; init; }

    /// <summary>Sent only when <see cref="Fee"/> is above 0.</summary>
    public Guid? FeeAccountId { get; init; }
}

/// <summary>Mirrors the service's <c>TransferDto</c>: the transfer record and the postings it recorded.</summary>
public sealed record TransferDto
{
    public required Guid Id { get; init; }

    public required Guid SourceAccountId { get; init; }

    public required Guid DestinationAccountId { get; init; }

    public decimal Amount { get; init; }

    public required string SourceCurrency { get; init; }

    public required string DestinationCurrency { get; init; }

    public decimal? ExchangeRate { get; init; }

    public decimal Fee { get; init; }

    public Guid? FeeAccountId { get; init; }

    public decimal ConvertedAmount { get; init; }

    public DateTimeOffset RecordedAt { get; init; }

    public string? CallingSystem { get; init; }

    public string? IdempotencyKey { get; init; }

    /// <summary>The 2 postings the transfer recorded, or 4 with a fee. A later reversal is not listed.</summary>
    public IReadOnlyList<PostingDto> Postings { get; init; } = [];
}
