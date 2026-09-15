using DKNet.EfCore.DtoGenerator;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.AppServices.Postings.V1;

// Reproduces exactly today's hand-written fields (DRK-1277 §3 row 7, needed now that Posting carries
// [CrudAction]): IdempotencySignature is internal-only and never reaches the API contract; SignedValue is
// excluded and re-declared as SignedAmount below (Mapster's Posting->PostingDto map in AppSetup already
// carries that rename); the six audit properties are excluded like every other DTO in this migration.
[GenerateDto(typeof(Posting), Exclude =
[
    nameof(Posting.SignedValue), nameof(Posting.IdempotencySignature),
    nameof(Posting.CreatedBy), nameof(Posting.CreatedOn),
    nameof(Posting.UpdatedBy), nameof(Posting.UpdatedOn),
    nameof(Posting.LastModifiedBy), nameof(Posting.LastModifiedOn)
])]
public sealed partial record PostingDto
{
    public required decimal SignedAmount { get; init; }
}
