using DKNet.EfCore.DtoGenerator;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.AppServices.Accounts.V1;

// Reproduces exactly today's hand-written fields (DRK-1277 §3 row 6): CurrencyCode is excluded and
// re-declared as Currency below — the entity's own column name, kept for the API contract the way it always
// read (Mapster's Account->AccountDto map in AppSetup already carries that rename) — and the six audit
// properties are excluded like every other DTO in this migration.
//
// AvailableBalance and OpenedOn are ALSO excluded and re-declared under different C# names (pr-reviewer,
// round 1): both are computed, unmapped entity members (`=> Balance` / `=> CreatedOn`), so the generic list
// route's field validation — which resolves a name against the entity for filter/orderBy — finds them,
// builds a predicate/ordering against them, and EF Core fails to translate it, turning a caller's malformed
// `filter`/`orderBy` into an unhandled 500 instead of the 400 every other unmapped/nonexistent field gets.
// The fix mirrors Currency/CurrencyCode exactly: the DTO-declared name no longer matches anything the query
// engine can resolve on the entity, so `filter`/`orderBy` on it now takes the same "no such field"/"not a
// valid operation" 400 path `Currency` already does — while `[JsonPropertyName]` keeps the response body's
// `availableBalance`/`openedOn` keys unchanged (R4: no DTO field lost).
[GenerateDto(typeof(Account), Exclude =
[
    nameof(Account.CurrencyCode), nameof(Account.AvailableBalance), nameof(Account.OpenedOn),
    nameof(Account.CreatedBy), nameof(Account.CreatedOn),
    nameof(Account.UpdatedBy), nameof(Account.UpdatedOn),
    nameof(Account.LastModifiedBy), nameof(Account.LastModifiedOn)
])]
public sealed partial record AccountDto
{
    public required string Currency { get; init; }

    [JsonPropertyName("availableBalance")]
    public required decimal AvailableBalanceAmount { get; init; }

    [JsonPropertyName("openedOn")]
    public required DateTimeOffset AccountOpenedOn { get; init; }

    /// <summary>
    /// Query-surface-only restoration of the old hand-written route's `?currency=` filter dimension
    /// (pr-reviewer, round 1 — R4): a real, EF-mapped column, so `filter=CurrencyCode:...`/`orderBy=CurrencyCode`
    /// resolve and translate exactly like any other plain column. Never serialized — the response keeps
    /// reading `currency` (<see cref="Currency"/>) exactly as before; this exists only so the field is
    /// declared on the model for <c>ListQuery</c>'s validation to find.
    /// </summary>
    // Not `required`: System.Text.Json rejects a required property that is also [JsonIgnore] (it can never
    // be satisfied during deserialization) — Mapster's name-matched projection still populates it on every
    // read path regardless.
    [JsonIgnore]
    public string CurrencyCode { get; init; } = string.Empty;
}

public sealed record AccountBalanceDto
{
    public string Currency { get; init; } = null!;

    public decimal Balance { get; init; }

    public decimal AvailableBalance { get; init; }

    public decimal HeldAmount { get; init; }

    // R3: a computed, unmapped member must never reach AccountDto (see its own comment) — Floor follows the
    // same precedent but lives here instead, on the balance-only DTO the generic list route never projects.
    public decimal Floor { get; init; }
}
