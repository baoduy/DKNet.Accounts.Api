# Currencies

> The reference currencies this service can denominate accounts and postings in.

## What Is This?

A stored, editable reference list of currencies — each one a code, a display name and how many
decimal places it is legally denominated to. Every account is opened in exactly one of these
currencies, and every posting amount is refused if it carries more decimal places than its currency
permits. Unlike a hard-coded ISO 4217 table, a currency here is a row: it can be registered, renamed,
deactivated and reactivated at run time, so a non-fiat asset (this service ships `USDT`, at 6 decimal
places) registers the same way a fiat currency does.

## Why Does It Exist?

- **Every posting needs a precision rule.** `DecimalPlaces` is the single source of truth
  [`postings`](../postings/README.md) validates amounts against — `10.555 USD` is refused because USD
  is denominated to two places.
- **New assets need no code change.** Registering `USDT` at 6 decimal places is a `POST`, not a
  deploy.
- **A currency no account should open in anymore can be retired without deleting history.**
  Deactivating removes it from the set new accounts may open in, while every existing account and
  posting in it is untouched.

## Quick Start

### List the seeded currencies

```http
GET /v1/currencies
Authorization: Bearer {token}
```

```json
{
  "items": [
    { "id": "3fa85f64-...-46e6", "code": "SGD", "name": "Singapore Dollar", "decimalPlaces": 2, "isActive": true },
    { "id": "c0de0002-0000-4000-8000-000000000001", "code": "USDT", "name": "Tether USD", "decimalPlaces": 6, "isActive": true }
  ],
  "pageNumber": 1, "pageSize": 1000, "totalItemCount": 26, "hasNextPage": false, "hasPreviousPage": false
}
```

### Register a new currency

```http
POST /v1/currencies
Content-Type: application/json
Authorization: Bearer {token}

{ "code": "XAU", "name": "Gold (troy ounce)", "decimalPlaces": 4 }
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| **`decimalPlaces`** | Fixed once a currency is registered — there is deliberately no rename-precision method, because `PostingAmount.Validate` and every stored money value round against it. |
| **`isActive`** | The account-opening gate, not a visibility flag. A deactivated currency still lists, and every account already open in it keeps working — only `POST /v1/accounts` in that currency is refused (`UNSUPPORTED_CURRENCY`). |
| **No delete route** | A currency is retired by deactivating it, never removed — the same append-only philosophy as the ledger itself. |

## Feature Map

| Layer | Path |
|-------|------|
| Domain entity | `ApiEndpoints/DKNet.Accounts.Domains/Features/Currencies/Entities/Currency.cs` |
| EF Core mapping | `ApiEndpoints/DKNet.Accounts.Infra/Features/Currencies/Mappers/CurrencyConfigs.cs` |
| Seed data | `ApiEndpoints/DKNet.Accounts.Infra/Features/Currencies/SeededCurrencies.cs` |
| Create / Rename validators | `ApiEndpoints/DKNet.Accounts.AppServices/Currencies/V1/Actions/Create.cs`, `Rename.cs` |
| Deactivate handler | `ApiEndpoints/DKNet.Accounts.AppServices/Currencies/V1/Actions/Deactivate.cs` |
| Spec | `ApiEndpoints/DKNet.Accounts.AppServices/Currencies/V1/Specs/SpecGetCurrency.cs` |
| DTO | `ApiEndpoints/DKNet.Accounts.AppServices/Currencies/V1/CurrencyDto.cs` |
| API endpoint | `ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Currencies/CurrenciesV1Endpoint.cs` |

## Related Documentation

- [Architecture](architecture.md)
- [API Reference](api-reference.md)
- [Data Model](data-model.md)
- [Accounts](../accounts/README.md) — every account opens in one of these currencies.
- [Postings](../postings/README.md) — every posting amount is validated against its currency's `decimalPlaces`.
