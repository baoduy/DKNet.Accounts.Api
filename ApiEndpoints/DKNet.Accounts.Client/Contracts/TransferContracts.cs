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

/// <summary>Query arguments for <c>GET /v1/accounts/{id}/transfers</c>. A missing <see cref="To"/> means today's UTC
/// date and a missing <see cref="From"/> the same date 1 year earlier; the window is at most 1 year.</summary>
public sealed record AccountTransfersQuery
{
    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }

    /// <summary>Matches the idempotency key or the calling system. Minimum 2 characters.</summary>
    public string? Search { get; init; }

    /// <summary>One of <c>recordedAt</c>, <c>amount</c>, <c>convertedAmount</c>, <c>fee</c>. None means newest
    /// first.</summary>
    public string? OrderBy { get; init; }

    public bool Desc { get; init; }

    public int? PageNumber { get; init; }

    public int? PageSize { get; init; }
}

/// <summary>Mirrors the service's <c>TransferRowDto</c>: one row of an account's transfer list, the transfer record
/// without its postings.</summary>
public sealed record TransferRow
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
}
