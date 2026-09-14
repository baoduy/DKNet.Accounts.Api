using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Postings.V1.Specs;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.AppServices.Postings.V1.Queries;

public sealed record GetPostingByIdQuery : Fluents.Queries.IWitResponse<PostingDto>
{
    public required Guid Id { get; init; }
}

internal sealed class GetPostingByIdQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IHandler<GetPostingByIdQuery, PostingDto>
{
    public Task<PostingDto?> OnHandle(GetPostingByIdQuery request, CancellationToken cancellationToken) =>
        repository.FirstOrDefaultAsync<Posting, PostingDto>(new SpecGetPosting(request.Id), cancellationToken);
}
