namespace DKNet.Accounts.AppServices.Postings.V1.Actions;

/// <summary>
/// Records a single credit or debit. <see cref="IdempotencyKey"/> is threaded in by the endpoint from the
/// <c>Idempotency-Key</c> request header, scoped to the calling system. <see cref="RecordedBy"/> mirrors
/// the contract's <c>recordedBy</c> body field — model-bound but never read: the calling system is always
/// taken from the credential's <c>client_id</c> claim (§5), never from the request body.
/// </summary>
public sealed record RecordPostingRequest : Fluents.Requests.IWitResponse<PostingDto>
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

    public Guid? TransactionGroupId { get; set; }

    public string? ExternalReference { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }

    public string? RecordedBy { get; set; }

    public string? IdempotencyKey { get; set; }
}

internal sealed class RecordPostingCommandHandler : Fluents.Requests.IHandler<RecordPostingRequest, PostingDto>
{
    public Task<IResult<PostingDto>> OnHandle(RecordPostingRequest request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
