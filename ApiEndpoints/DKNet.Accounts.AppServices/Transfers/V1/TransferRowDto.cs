using DKNet.EfCore.DtoGenerator;
using DKNet.Accounts.Domains.Features.Transfers.Entities;

namespace DKNet.Accounts.AppServices.Transfers.V1;

/// <summary>One row of an account's transfer list (DRK-2300 §3a): every <see cref="Transfer"/> field except the
/// audit stamps, without the postings <see cref="TransferDto"/> carries. Amounts are written at their own
/// currency's decimal places.</summary>
[AmountCurrency(nameof(Amount), nameof(SourceCurrency))]
[AmountCurrency(nameof(Fee), nameof(SourceCurrency))]
[AmountCurrency(nameof(ConvertedAmount), nameof(DestinationCurrency))]
[GenerateDto(typeof(Transfer), Exclude =
[
    nameof(Transfer.CreatedBy), nameof(Transfer.CreatedOn),
    nameof(Transfer.UpdatedBy), nameof(Transfer.UpdatedOn),
    nameof(Transfer.LastModifiedBy), nameof(Transfer.LastModifiedOn)
])]
public sealed partial record TransferRowDto;
