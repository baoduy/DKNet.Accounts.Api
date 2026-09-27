# Accounts

> Where a balance lives — one currency, one classification, one posting stream.

## What Is This?

An account sits inside exactly one [account group](../account-groups/README.md), in exactly one
[currency](../currencies/README.md), with an accounting classification that fixes which side of the
ledger increases it. It carries its own balance, the controls that bound how far it may fall, and its
position in its own posting stream. Every field this record returns is listed in
[the root README](../../../README.md).

## Why Does It Exist?

- **Every posting needs somewhere to land.** [Postings](../postings/README.md) are always recorded
  against exactly one account, in that account's own currency.
- **Every account needs exactly one determinate floor.** An account not permitted to go negative has
  a floor of zero (or its minimum balance where higher); one permitted to go negative has a floor of
  its overdraft limit (or its minimum balance where higher) — and permitting negative balances with no
  overdraft limit is refused outright, so no account is ever left without a floor.
- **Status has to gate postings, not just visibility.** A closed or frozen account accepts nothing; a
  dormant one accepts credits only — enforced on every posting and every reversal, not only at read
  time.

## Quick Start

### Open an account

```http
POST /v1/accounts
Content-Type: application/json
Authorization: Bearer {token}

{
  "groupId": "b85813c0-3053-4d35-a0ef-3f2863f83fa9",
  "name": "Acme Operating — SGD",
  "currency": "SGD",
  "classification": "Asset",
  "permittedToGoNegative": false
}
```

### Read its balance

```http
GET /v1/accounts/{id}/balance
Authorization: Bearer {token}
```

```json
{ "currency": "SGD", "balance": 0.00, "availableBalance": 0.00, "heldAmount": 0.00, "floor": 0.00 }
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Account number** | Service-allocated, `{group code}-{suffix}` — the caller may supply the suffix (3–10 characters) or let the service generate one; the group-code prefix is never caller-supplied. |
| **The floor** | The most restrictive of the account's controls — see [Why Does It Exist?](#why-does-it-exist). Recomputed on every open and every `PATCH`, never stored as its own column. |
| **`availableBalance` / `heldAmount`** | Always equal to `balance` / `0` in this delivery — the fields exist, held-funds behaviour does not. |
| **Status** | `Active`, `Frozen`, `Dormant`, `Closed` — freely settable through `PATCH {id}`, except that closing while a balance or held amount is non-zero is refused. |
| **Two update routes** | `PUT {id}` changes `name`/`metadata` only; `PATCH {id}` changes `status`/`overdraftLimit`/`minimumBalance`/`permittedToGoNegative` only. Neither route overlaps the other's fields. |

## Feature Map

| Layer | Path |
|-------|------|
| Domain entity | `ApiEndpoints/DKNet.Accounts.Domains/Features/Accounts/Entities/Account.cs` (also holds the `AccountPostingPolicy` static class, `Account.cs:263`), `AccountFloorPolicy.cs` |
| EF Core mapping | `ApiEndpoints/DKNet.Accounts.Infra/Features/Accounts/Mappers/AccountConfigs.cs` |
| Open (create) | `ApiEndpoints/DKNet.Accounts.AppServices/Accounts/V1/Actions/Open.cs` |
| Change details (`PUT`) | `ApiEndpoints/DKNet.Accounts.AppServices/Accounts/V1/Actions/ChangeDetails.cs` |
| Update status/floor (`PATCH`) | `ApiEndpoints/DKNet.Accounts.AppServices/Accounts/V1/Actions/Update.cs` |
| Balance / ledger balances / statement queries | `ApiEndpoints/DKNet.Accounts.AppServices/Accounts/V1/Queries/` |
| Specs | `ApiEndpoints/DKNet.Accounts.AppServices/Accounts/V1/Specs/` |
| DTO | `ApiEndpoints/DKNet.Accounts.AppServices/Accounts/V1/AccountDto.cs` |
| API endpoint | `ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs` |

## Related Documentation

- [Architecture](architecture.md)
- [API Reference](api-reference.md)
- [Data Model](data-model.md)
- [Account Groups](../account-groups/README.md) — every account belongs to exactly one group.
- [Currencies](../currencies/README.md) — every account opens in exactly one currency.
- [Postings](../postings/README.md) — the statement route (`GET {id}/statement`) is documented there.
