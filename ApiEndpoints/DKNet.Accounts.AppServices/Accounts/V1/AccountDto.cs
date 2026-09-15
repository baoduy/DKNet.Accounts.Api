using DKNet.EfCore.DtoGenerator;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.AppServices.Accounts.V1;

// Reproduces exactly today's hand-written fields (DRK-1277 §3 row 6): CurrencyCode is excluded and
// re-declared as Currency below — the entity's own column name, kept for the API contract the way it always
// read (Mapster's Account->AccountDto map in AppSetup already carries that rename) — and the six audit
// properties are excluded like every other DTO in this migration.
[GenerateDto(typeof(Account), Exclude =
[
    nameof(Account.CurrencyCode),
    nameof(Account.CreatedBy), nameof(Account.CreatedOn),
    nameof(Account.UpdatedBy), nameof(Account.UpdatedOn),
    nameof(Account.LastModifiedBy), nameof(Account.LastModifiedOn)
])]
public sealed partial record AccountDto
{
    public required string Currency { get; init; }
}

public sealed record AccountBalanceDto
{
    public string Currency { get; init; } = null!;

    public decimal Balance { get; init; }

    public decimal AvailableBalance { get; init; }

    public decimal HeldAmount { get; init; }
}
