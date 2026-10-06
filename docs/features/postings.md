# Postings

The append-only ledger — single credits and debits, all-or-nothing batches, and reversals.

## 📖 Overview

- **The ledger is provably append-only.** A recorded posting is never altered or removed; a mistake is corrected by writing an opposing posting, so both stay readable and attributable.
- **A retry is free.** Every write is keyed by the caller's own `Idempotency-Key`, scoped to its calling system — a repeat returns the original outcome instead of double-posting.
- **Concurrent postings on one account never race.** A per-account lock and a signed-content idempotency check together mean every posting is either recorded exactly once or refused with a stated reason — none silently dropped or double-applied.
- Called by any system recording a movement it caused elsewhere (a payment, a settlement, an adjustment) against an account it already opened here.

## 🏢 Business domain

Postings is the movement layer under [Accounts](accounts.md): every posting is recorded against exactly one account, in that account's own currency, and it is what actually changes the account's balance — `Account.TryApplyPosting` is the only path a posting's effect ever takes.

| Term | Meaning | In the code |
|---|---|---|
| `signedAmount` | The amount resolved against the account's ledger side — this is what sums to the balance, not `amount` | `Posting.SignedValue`, via `AccountPostingPolicy.SignedValue` |
| Idempotency scope | `(callingSystem, Idempotency-Key)` — a key is also effectively scoped to the endpoint that first used it | `IX_Postings_CallingSystem_IdempotencyKey`, `PostingSignature` |
| The per-account lock | An in-process lock per account id, held for the duration of a write, with a 10-second timeout | `IAccountLockProvider` / `AccountLockProvider` |
| The 90-day window | `GET /v1/postings` (cross-account list) requires an effective-date window of at most 90 days; the per-account statement has no such cap | `ListPostingsQuery` validator |

| Rule | Enforced by | A caller who breaks it gets |
|---|---|---|
| A posting amount is always strictly positive, decimal places ≤ the currency's | `PostingAmount.Validate` | `422 INVALID_POSTING_AMOUNT` |
| A posting's currency always equals its account's currency | Handler check | `422 CURRENCY_MISMATCH` |
| Effective date is never later than the recording date | Handler check | `422 EFFECTIVE_DATE_IN_FUTURE` |
| A debit past the account's floor is refused, except on a reversal | `AccountFloorPolicy.Floor` | `422 INSUFFICIENT_FUNDS` |
| A posting can be reversed at most once | `Posting.MarkReversedBy` (one-way) | `422 POSTING_ALREADY_REVERSED` |
| Same idempotency key + same content replays; same key + different content conflicts | `PostingSignature` comparison | `409 IDEMPOTENCY_KEY_CONFLICT` |

## 🚀 Quick Start

Get a JWT bearer token from your issuer, carrying `scp` (or `scope`) `postings.write` (recording), `postings.read` (reading back) and `postings.reverse` (correcting) — see [Getting a token](../integration-guide.md#before-you-start) or, for a local instance, [Local setup with Microsoft Entra ID](../local-setup-entra.md).

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

```http
POST /v1/postings/{id}/reverse
Content-Type: application/json
Authorization: Bearer {token}
Idempotency-Key: 9c1b7e6f-4d3c-4a7c-8f1d-1a2b5c6d7e02

{ "reason": "Posted against the wrong account" }
```

## 🔄 End-to-end flow

Only `GET /v1/postings/{id}` is generated; every other route in this slice — list, record, batch, reverse, and the statement route mapped on the accounts group — is hand-written, because each carries orchestration a generator cannot express: a lock, an idempotency replay, or a cross-aggregate refusal.

![Client posts to /v1/postings; the handler validates the currency, amount and effective date, checks idempotency, acquires the per-account lock, re-fetches the account and checks the currency matches, applies the posting against the account's status and floor, inserts the posting and its outbox row in one save, then publishes a postings.created event.](../diagrams/postings-record.svg)

The idempotency pre-check runs *before* the lock is acquired — a deliberate, documented trade-off: two first-uses of the same key can both miss that read, and the second is then refused `409` by the database's own unique index on `(CallingSystem, IdempotencyKey)` rather than replayed — a narrow, accepted race, not a silent double-post. This diagram can't show the transaction boundary in full: the entity and its outbox row commit in the one `SaveChanges` call that runs after the handler returns, and a bus outage never fails the write — the event waits in the outbox and is retried every 10 seconds, indefinitely (see [📣 Events](#-events)).

![Posting status starts Posted on record; POST {id}/reverse moves it to Reversed, refused if it is already reversed under a new key or if the account's status does not accept a movement in the reversal's own direction. Reversed is terminal.](../diagrams/postings-status.svg)

`MarkReversedBy` throws if called twice, so a posting can be reversed at most once — there is no path back to `Posted`.

### The per-account lock

`IAccountLockProvider` (`Domains/Services/IAccountLockProvider.cs`), implemented by `AccountLockProvider` (`Infra/Services/AccountLockProvider.cs`) as a `ConcurrentDictionary<Guid, SemaphoreSlim>` keyed per account id. Record, RecordBatch and Reverse all acquire it for the account(s) they touch, for up to 10 seconds, before applying anything — this is what makes "recorded exactly once or refused" true under concurrent writes on the same account.

This is a **single-process, in-memory lock** — correct for one running instance, not for a horizontally-scaled deployment, where two instances could each acquire "their own" lock for the same account. Upgrade path: a database-level advisory lock (e.g. Postgres `pg_advisory_xact_lock`), or an optimistic unique-index-plus-retry scheme, if this service is ever scaled to more than one instance.

On record, record batch, and reverse, `Idempotency-Key` is compared without regard to case for the same calling system. New postings store and return the lowercase key; a replay of a posting stored before this change returns its original mixed-case key. `SpecGetPosting` lowercases the stored column during lookup, so a keyed request scans that calling system's postings instead of using the raw-key unique index.

## 🔌 Endpoints

| Verb | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/v1/postings` | List postings across every account, within a required date window | `postings.read` |
| `POST` | `/v1/postings` | Record one credit or debit | `postings.write` |
| `POST` | `/v1/postings/batch` | Record several movements as one all-or-nothing batch | `postings.write` |
| `GET` | `/v1/postings/{id}` | Read one posting | `postings.read` |
| `POST` | `/v1/postings/{id}/reverse` | Reverse a posting | `postings.reverse` |
| `GET` | `/v1/accounts/{id}/statement` | Date-bounded, paged statement for one account, in stream order | `postings.read` |

### `GET /v1/postings`

Hand-mapped: explicit query parameters, not `[AsParameters]` — a deliberate minimal-API binding-trap avoidance. Validated explicitly against an injected `IValidator<ListPostingsQuery>` before the query runs.

- **Auth:** `postings.read`
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `from` / `to` | date | ✓ (both) | inclusive effective-date window, at most 90 days wide, `to >= from` | query |
  | `accountId` | uuid | — | narrows to one account | query |
  | `direction` | enum | — | `Credit`/`Debit` | query |
  | `category` | enum | — | one of the eight categories | query |
  | `status` | enum | — | `Posted`/`Reversed` | query |
  | `search` | string | — | ≥ 2 characters, matches `PostingNumber`, `CounterpartyReference`, `Description` | query |
  | `orderBy` / `desc` | string / bool | — | one of `EffectiveDate`, `Amount`, `PostingNumber`, `RecordedAt`, `StreamPosition`; default order is `StreamPosition` | query |
  | `pageNumber` / `pageSize` | int | — | same paging contract as [the generic list endpoint](../generic-list-endpoint.md) | query |

- **Response:** `200 OK` — `PagedResponse<PostingDto>`
- **Errors:**

  | Status | Code | When |
  |---|---|---|
  | `400` | — | An unrecognised `orderBy`/`direction`/`category`/`status` value, or a `search` under 2 characters |
  | `422` | `INVALID_DATE_RANGE` | No window, or one wider than 90 days |

- **Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://accounts.example.com/v1/postings?from=2026-06-01&to=2026-06-30&direction=Credit"
```

### `POST /v1/postings`

Records one credit or debit.

- **Auth:** `postings.write`
- **Idempotency:** `Idempotency-Key` declared `[FromRequestHeader]` — published as a header parameter on the operation itself. **Optional** — omitting it skips the replay/conflict check entirely, so a retry with no key records a second posting. When supplied: same key, same content → `200` with the original posting, nothing new recorded; same key, different content → `409 IDEMPOTENCY_KEY_CONFLICT`. A key placed in the request body instead is discarded — the header source overwrites it before validation
- **Concurrency:** `IAccountLockProvider` holds a process-local lock for the account during the write. If it cannot acquire the lock within 10 seconds, the route refuses the request with `422 LOCK_TIMEOUT`.
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `accountId` | uuid | ✓ | must resolve to an existing account | body |
  | `direction` | enum | ✓ | `Credit`/`Debit` | body |
  | `amount` | decimal | ✓ | strictly positive, decimal places ≤ the account's currency | body |
  | `currency` | string | ✓ | 3–10 characters, must resolve to an active currency, and must equal the account's own currency | body |
  | `category` | enum | ✓ | one of the eight categories | body |
  | `effectiveDate` | date | — | never later than the recording date; unset defaults to the recording date | body |
  | `transactionGroupId` | uuid | — | ties several movements together | body |
  | `counterpartyAccountId` / `counterpartyReference` / `externalReference` / `description` / `metadata` | — | — | optional, no cross-field rule | body |
  | `Idempotency-Key` | string | — | optional header, not a body field; no key means no deduplication | header |

- **Response:** `201 Created` — `PostingDto`
- **Errors:**

  | Status | Code | When |
  |---|---|---|
  | `404` | — | `accountId` does not resolve to an existing account |
  | `409` | `IDEMPOTENCY_KEY_CONFLICT` | Same key, different content — only reachable when a key was supplied |
  | `422` | `UNSUPPORTED_CURRENCY` | `currency` unknown or inactive |
  | `422` | `INVALID_POSTING_AMOUNT` | `amount` ≤ 0, or finer than the currency's decimal places |
  | `422` | `EFFECTIVE_DATE_IN_FUTURE` | `effectiveDate` later than the recording date |
  | `422` | `CURRENCY_MISMATCH` | `currency` does not equal the account's own currency |
  | `422` | `ACCOUNT_CLOSED` | The account is closed |
  | `422` | `ACCOUNT_FROZEN` | The account is frozen |
  | `422` | `ACCOUNT_DORMANT_DEBIT_REFUSED` | A debit against a dormant account |
  | `422` | `INSUFFICIENT_FUNDS` | A debit would take the account past its floor |
  | `422` | `AMOUNT_OUT_OF_RANGE` | The amount or the resulting balance exceeds 999,999,999,999.999999 |
  | `422` | `LOCK_TIMEOUT` | The 10-second per-account lock timed out |

- **Example:**

```bash
curl -X POST "https://accounts.example.com/v1/postings" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 6e6f4d3c-1b7e-4c7a-9f1d-8a2b5c6d7e01" \
  -d '{"accountId":"3fa85f64-5717-4562-b3fc-2c963f66afa6","direction":"Credit","amount":100.00,"currency":"SGD","category":"Transfer"}'
```

### `POST /v1/postings/batch`

Records several movements as one all-or-nothing batch — nothing is persisted unless every movement succeeds.

- **Auth:** `postings.write`
- **Idempotency:** `Idempotency-Key` declared `[FromRequestHeader]`, **optional** — same rule as `POST /v1/postings`. When supplied, the content signature is computed over the whole batch — a key already used on a single posting is refused `409`, not replayed, if reused on a batch (and vice versa). The key is recorded on the batch's first leg only; the other legs come back with no `idempotencyKey` of their own
- **Request:** `movements` — a non-empty array of the same fields as `POST /v1/postings` (minus the header) — plus a top-level, optional `transactionGroupId`: when unset, one is generated so every movement in the batch still shares one
- **Locking:** every distinct `accountId` in the batch is locked in ascending id order, to avoid a cross-batch deadlock; a timeout on any lock releases every lock already acquired
- **Response:** `201 Created` — `PostingDto[]`, one per movement, sharing one `transactionGroupId` when the request set one
- **Errors:** any one movement's refusal (from the table above, `404` included when a movement's `accountId` does not resolve) refuses the whole batch and records nothing
- **Example:**

```bash
curl -X POST "https://accounts.example.com/v1/postings/batch" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 2b7c1a4d-9e3f-4c6b-8a2d-1f5c6d7e8b03" \
  -d '{"movements":[{"accountId":"...","direction":"Debit","amount":100.00,"currency":"SGD","category":"Transfer"},{"accountId":"...","direction":"Credit","amount":100.00,"currency":"SGD","category":"Transfer"}]}'
```

### `GET /v1/postings/{id}`

The one generated route in this slice (`MapGetById<Posting, Guid, PostingDto>`).

- **Auth:** `postings.read`
- **Response:** `200 OK` — `PostingDto`
- **Errors:**

  | Status | Code | When |
  |---|---|---|
  | `404` | — | Unknown id |

- **Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/postings/{id}"
```

### `POST /v1/postings/{id}/reverse`

Reverses a posting — mapped through the generic `MapActionById<ReversePostingRequest, Guid, PostingDto>` (deliberately **not** `[CrudAction]`, since the handler is entirely hand-written).

![Handler pre-checks idempotency, acquires the original posting's account lock, re-reads the original inside the lock, applies the opposite direction against the account's status only (the floor check is skipped), then inserts the reversal and marks the original reversed in one save.](../diagrams/postings-reverse.svg)

- **Auth:** `postings.reverse`
- **Concurrency:** `IAccountLockProvider` takes a process-local per-account lock, then the handler re-reads the original. No ETag or row version is sent. A competing reversal is refused `POSTING_ALREADY_REVERSED` after the first commits.
- **Idempotency:** `Idempotency-Key` **required** header (unlike Record/RecordBatch, a reversal refuses outright if it is missing)
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `reason` | string | ✓ | 1–500 characters; recorded as the reversal's `description` | body |
  | `Idempotency-Key` | string | ✓ | required header | header |

- **Response:** `200 OK` — `PostingDto` (the new opposing posting)
- **Errors:**

  | Status | Code | When |
  |---|---|---|
  | `400` | — | Missing `reason` or `Idempotency-Key` |
  | `404` | — | Unknown posting id |
  | `409` | `IDEMPOTENCY_KEY_CONFLICT` | Same key, different reason |
  | `422` | `POSTING_ALREADY_REVERSED` | Already reversed under a new key (a retry under the *same* key replays the earlier reversal with `200` instead) |
  | `422` | `ACCOUNT_CLOSED` / `ACCOUNT_FROZEN` / `ACCOUNT_DORMANT_DEBIT_REFUSED` | Every status-gate refusal from `POST /v1/postings` still applies, to the reversal's own direction |
  | `422` | `AMOUNT_OUT_OF_RANGE` | The ceiling check is a storage limit, not a policy a reversal is exempt from, unlike the floor check |
  | `422` | `LOCK_TIMEOUT` | The 10-second per-account lock timed out |

- **Example:**

```bash
curl -X POST "https://accounts.example.com/v1/postings/{id}/reverse" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 9c1b7e6f-4d3c-4a7c-8f1d-1a2b5c6d7e02" \
  -d '{"reason":"Posted against the wrong account"}'
```

### `GET /v1/accounts/{id}/statement`

Date-bounded, paged statement for one account, in stream order — never effective-date order, so a backdated posting appears where it was recorded, not among the postings whose effective dates surround it. Mapped on the accounts endpoint group (`AccountsV1Endpoint.cs`) because it belongs to that route's URL, but its data and handler (`GetAccountStatementQueryHandler`) belong to this slice.

- **Auth:** `postings.read` — overrides the accounts group's default `accounts.read`, because this is a read over postings, not over the account record
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `from` / `to` | date | — | inclusive bounds, no 90-day cap (unlike `GET /v1/postings`) | query |
  | `pageIndex` | int | — | default `1` — its own name, not the generic list contract's `pageNumber` | query |
  | `pageSize` | int | — | default `20` — its own default, not the generic list contract's `1000` | query |

- **Response:** `200 OK` — `PagedResponse<PostingDto>` in stream order. Reading past the end returns an empty page with `200`, never an error
- **Errors:**

  | Status | Code | When |
  |---|---|---|
  | `404` | — | A non-GUID `{id}` — this route is mapped `{id:guid}`, so a malformed segment never matches the route at all. An **unknown but valid** id is not an error: the handler never looks the account up, so it answers `200` with an empty page, the same as a real account with no postings in the requested window |

- **Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://accounts.example.com/v1/accounts/{id}/statement?from=2026-06-01&to=2026-06-30"
```

## 🗃️ Data model

### Posting — `acc.Postings`

One row is one credit or debit recorded against exactly one account, at its gapless position in that account's stream.

The DB type names below describe the PostgreSQL mapping. SQL Server uses its own migration assembly and provider type mapping; see [Configuration reference](../configuration-reference.md#databaseprovider).

| Field | Column | DB type | Length / precision | Required | Key / index | Default | Purpose |
|---|---|---|---|---|---|---|---|
| `Id` | `Id` | uuid | — | ✓ | PK | new Guid | Service-generated identifier |
| `PostingNumber` | `PostingNumber` | varchar | 32 | ✓ | unique | — | Service-generated, unique across the service |
| `AccountId` | `AccountId` | uuid | — | ✓ | indexed | — | The account this posting moves |
| `StreamPosition` | `StreamPosition` | bigint | — | ✓ | unique per `(AccountId, StreamPosition)` | — | This posting's position in the account's stream — gapless, so a missing entry is detectable |
| `Direction` | `Direction` | text (`HasConversion<string>`) | — | ✓ | — | — | `Credit`/`Debit` — the direction, not the amount's sign, says which way money moved |
| `Amount` | `Amount` | decimal | 18,6 | ✓ | — | — | Always strictly positive, never finer than the currency permits |
| `Currency` | `Currency` | varchar | 10 | ✓ | — | — | Always equal to the account's currency |
| `SignedValue` | `SignedValue` | decimal | 18,6 | ✓ | — | — | The amount resolved against the account's ledger side — what sums to the balance (see [Signed amount resolution](#signed-amount-resolution)) |
| `BalanceAfter` | `BalanceAfter` | decimal | 18,6 | ✓ | — | — | The account's balance immediately after this posting |
| `EffectiveDate` | `EffectiveDate` | date | — | ✓ | indexed with `AccountId`+`StreamPosition` | — | May be backdated; never later than `RecordedAt` |
| `RecordedAt` | `RecordedAt` | timestamptz | — | ✓ | — | — | The moment the service recorded it |
| `Category` | `Category` | text (`HasConversion<string>`) | — | ✓ | — | — | One of eight business categories |
| `Status` | `Status` | text (`HasConversion<string>`) | — | ✓ | — | `Posted` | `Posted` or `Reversed` once a reversal has been written against it |
| `ReversesPostingId` | `ReversesPostingId` | uuid | — | — | — | — | Set only on a reversal — a plain column, no FK constraint (cross-aggregate references are by id only, DKNET-AGG-004) |
| `ReversedByPostingId` | `ReversedByPostingId` | uuid | — | — | — | — | Set once by `MarkReversedBy`, never cleared — a plain column, no FK constraint |
| `TransactionGroupId` | `TransactionGroupId` | uuid | — | — | — | — | Ties every leg of one batch together |
| `CounterpartyAccountId` | `CounterpartyAccountId` | uuid | — | — | — | — | The other side, when it is an account inside this service |
| `CounterpartyReference` | `CounterpartyReference` | varchar | 200 | — | — | — | The other side, when it is outside this service |
| `CallingSystem` | `CallingSystem` | varchar | 100 | ✓ | unique with `IdempotencyKey` | — | The system that recorded this posting — from the credential, never the request body |
| `IdempotencyKey` | `IdempotencyKey` | varchar | 255 | — | unique with `CallingSystem` (`IX_Postings_CallingSystem_IdempotencyKey`) | — | The key that calling system supplied, scoped to it |
| `IdempotencySignature` | `IdempotencySignature` | varchar | 64 | — | — | — | Content signature computed at write time — never returned in `PostingDto` |
| `ExternalReference` | `ExternalReference` | varchar | 200 | — | — | — | Caller's own reference for this posting |
| `Description` | `Description` | varchar | 500 | — | — | — | Narrative description; a reversal's `reason` is stored here |
| `Metadata` | `Metadata` | varchar (JSON string) | 4000 | — | — | — | Free-form key/value pairs |
| `CreatedBy` | `CreatedBy` | varchar | 255 | ✓ | — | — | Stamped by the audit hook, never by a request field |
| `CreatedOn` | `CreatedOn` | timestamptz | — | ✓ | — | — | When the row was created |
| `UpdatedBy` | `UpdatedBy` | varchar | 255 | — | — | — | Stamped by the audit hook on the one write after insert — `MarkReversedBy` |
| `UpdatedOn` | `UpdatedOn` | timestamptz | — | — | — | — | When that one write happened |

`PostingDto` excludes `SignedValue` and `IdempotencySignature` from the generated shape, then re-declares `SignedValue` by hand as the response field `signedAmount` — `IdempotencySignature` never reaches the response at all, and is never included in the `postings.created`/`postings.updated` event payload either. `Posting` does carry `UpdatedBy`/`UpdatedOn`, from the same audited-entity base every aggregate in this service derives from — in practice they are set only once, on the one write after insert: the one-way `Status`/`ReversedByPostingId` pair `MarkReversedBy` sets. `Posting n — 1 Account` via `AccountId`, a plain indexed column, not a mapped EF Core relationship; `Posting 0..1 — 0..1 Posting` via `ReversesPostingId`/`ReversedByPostingId`, also plain columns with no FK constraint.

#### Signed amount resolution

`SignedValue` is computed by `AccountPostingPolicy.SignedValue` (on `Account`, not `Posting`) before the posting is constructed:

```csharp
public static decimal SignedValue(AccountClassification classification, bool isDebit, decimal amount)
{
    var debitIncreases = classification is AccountClassification.Asset or AccountClassification.Expense;
    var increases = isDebit == debitIncreases;
    return increases ? amount : -amount;
}
```

A credit raises a `Liability`, `Equity` or `Income` account and lowers an `Asset` or `Expense` one; a debit is the opposite. This is why a *credit* — not a debit — is what `INSUFFICIENT_FUNDS` refuses on a fresh `Asset` account with a floor of zero: `direction` alone never tells you the sign.

| Status | Meaning | Reached by | Next |
|---|---|---|---|
| `Posted` | The normal, correctable state | `POST /v1/postings`, `POST /v1/postings/batch` (always) | `Reversed` |
| `Reversed` | Terminal — `MarkReversedBy` throws if called on an already-reversed posting | `POST /v1/postings/{id}/reverse` | none — a reversal can itself never be reversed as the *original* side of another reversal |

No delete or archival path for posting rows is wired in this repository. The deployment guide covers schema changes; an online retention target is an operator policy question.

## 📣 Events

Declared on `Posting` with `[RaisesEvent]` (DRK-1773 §3a) and raised by the DKNet EF Core save hook. `postings.updated` fires only when `Status` changes — i.e. only on a reversal — and its payload never carries `IdempotencySignature`.

| Event | Raised when | Payload | Transport | Consumers | Ordering | Duplicates | On failure |
|---|---|---|---|---|---|---|---|
| `postings.created` | A posting (including each leg of a batch, and a reversal's own opposing entry) is recorded | `id`, `accountId`, `postingNumber`, `streamPosition`, `direction`, `amount`, `currency`, `signedValue`, `balanceAfter`, `effectiveDate`, `recordedAt`, `category`, `status`, `reversedByPostingId`, `reversesPostingId`, `transactionGroupId`, `counterpartyAccountId`, `counterpartyReference`, `callingSystem`, `idempotencyKey`, `externalReference`, `description`, `metadata`, `createdBy`, `createdOn`, `updatedBy`, `updatedOn` | `ledger-events` queue | Any system subscribed to the outbound queue | No order guarantee in `ServiceBusSetup` | Redelivery retains `OutboundMessageId`; consumers can deduplicate by message ID | The selected database's outbox retries every 10 seconds without a configured limit; when external messaging is off, the event is dropped |
| `postings.updated` | A posting is marked reversed | Same field set, current values | `ledger-events` queue | Any system subscribed to the outbound queue | No order guarantee in `ServiceBusSetup` | Redelivery retains `OutboundMessageId`; consumers can deduplicate by message ID | The selected database's outbox retries every 10 seconds without a configured limit; when external messaging is off, the event is dropped |

Every event is wrapped as `{ "type": "postings.created", "payload": { ... } }` (`OutboundEnvelope`), stored in the same database save as the change, and sent over Azure Service Bus or RabbitMQ depending on `MessageBus:Transport`. A reversal raises both: `postings.created` for the new opposing entry and `postings.updated` for the original, from the one save that links them. With the message bus off, an event is dropped: nothing is stored and nothing is sent, but the posting itself is still recorded. With the bus on but the broker unreachable, the event waits in the outbox and is retried every 10 seconds, without limit, until it is delivered.

## 🌐 Downstream systems

| System | Direction | How | What for | When it is down |
|---|---|---|---|---|
| Any subscriber to `ledger-events` | it consumes our events | Azure Service Bus queue (when configured) or RabbitMQ fanout exchange + queue (local/integration), both named by `MessageBus:OutboundQueue` (default `ledger-events`) | Learn a posting was recorded or reversed | Event is retried from the selected database's outbox every 10 seconds, indefinitely |

Configuration keys: `FeatureManagement:EnableServiceBus`, `MessageBus:Transport`, `MessageBus:OutboundQueue`, `ConnectionStrings:AzureBus` / `ConnectionStrings:RabbitMq`.

## ⚙️ Configuration reference

| Key | Type | Required | Default | Rules | Secret | Takes effect | Effect |
|---|---|---|---|---|---|---|---|
| `MessageBus:Transport` | enum | no | `AzureServiceBus` | `AzureServiceBus` or `RabbitMq` | no | startup | Which broker `postings.*` events are sent on |
| `MessageBus:OutboundQueue` | string | no | `ledger-events` | No validator in `MessageBusOptions` | no | startup | The queue/exchange every outbound event, this feature's included, is sent to |
| `FeatureManagement:EnableServiceBus` | bool | no | `true` in base settings | `true` or `false` | no | startup | External bus wiring. Off means every event is dropped, not queued |

Shared settings, connection strings, and environment-variable mapping: [Configuration reference](../configuration-reference.md).

## ⚠️ Errors & limits

Every non-2xx response is `application/problem+json` — `title`, `status`, `type`, `traceId`, and an `errors[]` list of `{ message, code, field }`. Full shape and the complete refusal-code table: [the API contract](../api-contract.md#refusals-and-error-codes).

- **The per-account lock is single-process, in-memory** (`ConcurrentDictionary<Guid, SemaphoreSlim>`) — correct for one running instance, not a horizontally-scaled deployment, where two instances could each acquire "their own" lock for the same account. Upgrade path: a database-level advisory lock (e.g. Postgres `pg_advisory_xact_lock`), or an optimistic unique-index-plus-retry scheme, if this service is ever scaled to more than one instance.
- **`GET /v1/postings` requires an effective-date window of at most 90 days.** The per-account statement (`GET /v1/accounts/{id}/statement`) has no such cap.
- **A key is effectively scoped to the endpoint that first used it.** A single posting and a batch compute different content signatures even for the same movement, so reusing a key across the two is refused `409`, not replayed.
- **Nothing is ever rounded.** A stored amount above 999,999,999,999.999999 is refused (`AMOUNT_OUT_OF_RANGE`), never truncated.

## 🔗 Related features

- [Accounts](accounts.md) — every posting moves exactly one account, and carries its status/floor rules.
- [Currencies](currencies.md) — every posting amount is validated against its currency's `decimalPlaces`.
- [Accounts client (.NET)](../accounts-client.md) — reach for the `DKNet.Accounts.Client` NuGet package when calling this and the other three features from a .NET caller instead of raw HTTP.

## ❓ Open questions

| Question | Why it matters | Checked | Who can answer |
|---|---|---|---|
| Which systems consume this feature's outbound events? | Operators need a recipient list and replay coordination. | `ServiceBusSetup` declares outbound transport, but no subscriber registry. | Service owner |
| What online retention period applies to postings? | Operators need capacity and archival plans. | No posting delete or archive path is wired in this repo. | Service owner |
