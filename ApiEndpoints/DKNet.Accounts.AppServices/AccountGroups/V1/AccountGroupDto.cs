using DKNet.EfCore.DtoGenerator;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.AppServices.AccountGroups.V1;

// Reproduces exactly today's nine hand-written fields (DRK-1277 §3 row 5): the six audit properties
// AccountGroup exposes via AggregateRoot/AuditedEntity are excluded so the generated shape matches, field
// for field, what callers received before this DTO was generator-backed.
[GenerateDto(typeof(AccountGroup), Exclude =
[
    nameof(AccountGroup.CreatedBy), nameof(AccountGroup.CreatedOn),
    nameof(AccountGroup.UpdatedBy), nameof(AccountGroup.UpdatedOn),
    nameof(AccountGroup.LastModifiedBy), nameof(AccountGroup.LastModifiedOn)
])]
public sealed partial record AccountGroupDto;

/// <summary>
/// One line per currency (R: balances across different currencies are never summed together).
/// </summary>
public sealed record AccountGroupBalanceLineDto
{
    public string Currency { get; init; } = null!;

    public decimal Balance { get; init; }
}
