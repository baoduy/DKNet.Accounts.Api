using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Transfers.V1.Specs;
using DKNet.Accounts.Domains.Features.Transfers.Entities;

namespace DKNet.Accounts.AppServices.Transfers.V1.Queries;

public sealed record GetTransferQuery : Fluents.Queries.IWitResponse<TransferDto>
{
    public required Guid Id { get; init; }
}

internal sealed class GetTransferQueryHandler(IRepositorySpec repository, IMapper mapper)
    : Fluents.Queries.IHandler<GetTransferQuery, TransferDto>
{
    public async Task<TransferDto?> OnHandle(GetTransferQuery request, CancellationToken cancellationToken)
    {
        var transfer = await repository.FirstOrDefaultAsync(new SpecGetTransfer(request.Id), cancellationToken);
        return transfer is null ? null : await TransferReading.ToDtoAsync(repository, mapper, transfer, cancellationToken);
    }
}

/// <summary>The one way a transfer is turned into its response (R8) — shared by the read, the 201 and the
/// idempotent replay, so all three list the same postings in the same order.</summary>
internal static class TransferReading
{
    public static async Task<TransferDto> ToDtoAsync(
        IRepositorySpec repository, IMapper mapper, Transfer transfer, CancellationToken cancellationToken)
    {
        var postings = await repository.ToListAsync(new SpecListTransferPostings(transfer.Id), cancellationToken);
        return mapper.Map<TransferDto>(transfer) with { Postings = [.. postings.Select(mapper.Map<PostingDto>)] };
    }
}
