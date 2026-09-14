namespace DKNet.Accounts.AppServices.Postings.V1.Actions;

/// <summary>
/// One movement inside a <see cref="RecordPostingBatchRequest"/> — several movements recorded as one
/// all-or-nothing batch.
/// </summary>
public sealed record PostingBatchMovement
{
    public Guid AccountId { get; set; }

    public PostingDirection Direction { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = null!;

    public DateOnly? EffectiveDate { get; set; }

    public PostingCategory Category { get; set; }

    public string? Description { get; set; }

    public Guid? CounterpartyAccountId { get; set; }

    public string? CounterpartyReference { get; set; }

    public string? ExternalReference { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

public sealed record RecordPostingBatchRequest : Fluents.Requests.IWitResponse<IReadOnlyCollection<PostingDto>>
{
    public IReadOnlyCollection<PostingBatchMovement> Movements { get; set; } = [];

    /// <summary>
    /// Ties the legs of this batch together. When unset, a new one is generated so every movement in the
    /// batch still shares one transaction group identifier.
    /// </summary>
    public Guid? TransactionGroupId { get; set; }

    public string? RecordedBy { get; set; }

    public string? IdempotencyKey { get; set; }
}

internal sealed class RecordPostingBatchCommandHandler
    : Fluents.Requests.IHandler<RecordPostingBatchRequest, IReadOnlyCollection<PostingDto>>
{
    public Task<IResult<IReadOnlyCollection<PostingDto>>> OnHandle(
        RecordPostingBatchRequest request,
        CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
