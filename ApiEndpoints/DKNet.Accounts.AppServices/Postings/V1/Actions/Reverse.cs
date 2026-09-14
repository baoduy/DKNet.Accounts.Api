namespace DKNet.Accounts.AppServices.Postings.V1.Actions;

/// <summary>
/// Reverses a posting. Exempt from the account's floor but not from its status (§ invariants) — a
/// posting can be reversed at most once.
/// </summary>
public sealed record ReversePostingRequest : Fluents.Requests.IWitResponse<PostingDto>
{
    public Guid Id { get; set; }

    public string? Reason { get; set; }
}

internal sealed class ReversePostingCommandHandler : Fluents.Requests.IHandler<ReversePostingRequest, PostingDto>
{
    public Task<IResult<PostingDto>> OnHandle(ReversePostingRequest request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
