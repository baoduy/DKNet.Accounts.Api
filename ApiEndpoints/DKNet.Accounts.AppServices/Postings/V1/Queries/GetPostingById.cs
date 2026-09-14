namespace DKNet.Accounts.AppServices.Postings.V1.Queries;

public sealed record GetPostingByIdQuery : Fluents.Queries.IWitResponse<PostingDto>
{
    public required Guid Id { get; init; }
}

internal sealed class GetPostingByIdQueryHandler : Fluents.Queries.IHandler<GetPostingByIdQuery, PostingDto>
{
    public Task<PostingDto?> OnHandle(GetPostingByIdQuery request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}
