# Postings

> The append-only ledger — single credits and debits, all-or-nothing batches, and reversals.

## What Is This?

A posting is a single credit or debit against one [account](../accounts/README.md). Several movements
can be recorded as one all-or-nothing batch. A posting is never edited or deleted; it is corrected by
a reversal, which is itself a posting. The date-bounded, paged **statement** route
(`GET /v1/accounts/{id}/statement`) reads this same stream and is documented in this folder, even
though it is mapped on the accounts endpoint group.

## Why Does It Exist?

- **The ledger has to be provably append-only.** Nothing recorded here is ever altered or removed; a
  mistake is corrected by writing an opposing posting, so both stay readable and attributable.
- **A retry has to be free.** Every write is keyed by the caller's own `Idempotency-Key`, scoped to
  its calling system — a repeat returns the original outcome instead of double-posting.
- **Concurrent postings on one account must never race.** A per-account lock and a signed-content
  idempotency check together mean every posting is either recorded exactly once or refused with a
  stated reason — none silently dropped or double-applied.

## Quick Start

### Record a posting

```http
POST /v1/postings
Content-Type: application/json
Authorization: Bearer {token}
Idempotency-Key: 6e6f4d3c-1b7e-4c7a-9f1d-8a2b5c6d7e01

{
  "accountId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "direction": "Credit",
  "amount": 100.00,
  "currency": "SGD",
  "category": "Transfer"
}
```

### Reverse it

```http
POST /v1/postings/{id}/reverse
Content-Type: application/json
Authorization: Bearer {token}
Idempotency-Key: 9c1b7e6f-4d3c-4a7c-8f1d-1a2b5c6d7e02

{ "reason": "Posted against the wrong account" }
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| **`signedAmount`** | The amount resolved against the account's ledger side — this is what sums to the balance, not `amount`. See [the data model](data-model.md#signed-amount-resolution). |
| **Idempotency scope** | `(callingSystem, Idempotency-Key)`. A key is also effectively scoped to the endpoint that first used it — a single posting and a batch compute different content signatures even for the same movement. |
| **The per-account lock** | An in-process lock per account id, held for the duration of a write, with a 10-second timeout (`LOCK_TIMEOUT`). See [the ponytail note](architecture.md#the-per-account-lock) on its single-instance limit. |
| **Reversal is exempt from the floor, not from status** | A reversal may leave an account below its floor — that is a real, readable debt — but is still refused wherever the account's status does not accept a movement in the reversal's own direction. |
| **The 90-day window** | `GET /v1/postings` (cross-account list) requires an effective-date window of at most 90 days; the per-account statement has no such cap. |

## Feature Map

| Layer | Path |
|-------|------|
| Domain entity | `ApiEndpoints/DKNet.Accounts.Domains/Features/Postings/Entities/Posting.cs` |
| EF Core mapping | `ApiEndpoints/DKNet.Accounts.Infra/Features/Postings/Mappers/PostingConfigs.cs` |
| Record / batch / reverse handlers | `ApiEndpoints/DKNet.Accounts.AppServices/Postings/V1/Actions/Record.cs`, `RecordBatch.cs`, `Reverse.cs` |
| Refusal-code mapping | `ApiEndpoints/DKNet.Accounts.AppServices/Postings/V1/PostingRefusalMapping.cs` |
| Per-account lock | `ApiEndpoints/DKNet.Accounts.Domains/Services/IAccountLockProvider.cs`, `ApiEndpoints/DKNet.Accounts.Infra/Services/AccountLockProvider.cs` |
| List / statement queries | `ApiEndpoints/DKNet.Accounts.AppServices/Postings/V1/Queries/ListPostings.cs`, `ApiEndpoints/DKNet.Accounts.AppServices/Accounts/V1/Queries/GetAccountStatement.cs` |
| Specs | `ApiEndpoints/DKNet.Accounts.AppServices/Postings/V1/Specs/` |
| DTO | `ApiEndpoints/DKNet.Accounts.AppServices/Postings/V1/PostingDto.cs` |
| API endpoint | `ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Postings/PostingsV1Endpoint.cs` (statement route: `ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs`) |

## Related Documentation

- [Architecture](architecture.md)
- [API Reference](api-reference.md)
- [Data Model](data-model.md)
- [Accounts](../accounts/README.md) — every posting moves exactly one account, and carries its status/floor rules.
- [Currencies](../currencies/README.md) — every posting amount is validated against its currency's `decimalPlaces`.
