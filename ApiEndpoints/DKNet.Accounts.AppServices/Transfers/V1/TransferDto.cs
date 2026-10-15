using DKNet.EfCore.DtoGenerator;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.Domains.Features.Transfers.Entities;

namespace DKNet.Accounts.AppServices.Transfers.V1;

/// <summary>A transfer as both transfer routes and an idempotent replay return it (DRK-2276 §3a): every
/// <see cref="Transfer"/> field except the audit stamps, plus the postings the transfer recorded.</summary>
[GenerateDto(typeof(Transfer), Exclude =
[
    nameof(Transfer.CreatedBy), nameof(Transfer.CreatedOn),
    nameof(Transfer.UpdatedBy), nameof(Transfer.UpdatedOn),
    nameof(Transfer.LastModifiedBy), nameof(Transfer.LastModifiedOn)
])]
public sealed partial record TransferDto
{
    /// <summary>The 2 postings the transfer recorded, or 4 with a fee, in posting-number order. A later
    /// reversal of one of them is not listed.</summary>
    public IReadOnlyList<PostingDto> Postings { get; init; } = [];
}
