# DKNet.Accounts.Api

A shared, banking-grade account and ledger service: account groups, single-currency accounts, and an
append-only stream of credit and debit postings that any downstream system can post to, read back, and
reconcile against.

- **Full walkthrough:** [docs/integration-guide.md](docs/integration-guide.md) — authenticate, create a
  group, open an account, post, read the balance back, page a statement.
- **Machine-readable contract:** `GET /openapi/v1.json` on a running instance.

> **Delivery status at this commit.** Every route in [the API contract](#the-api-contract) is
> implemented and exercised by the acceptance suite — reference currencies, account groups, accounts,
> postings, batches, reversals and statements. The one capability that is deliberately *not* built is
> held funds: `heldAmount` and `availableBalance` exist and always answer `0` and `balance`
> respectively. See [Gotchas & limits](#️-gotchas--limits) for that and the other deferred items.

## ✨ Why use it?

- **You stop writing bookkeeping.** Balances, stream positions, idempotency and corrections are the
  service's problem, not yours. You record what happened; you read back a balance that provably equals
  the signed sum of what you recorded.
- **A retry is free.** Every posting write is keyed by your own `Idempotency-Key`, scoped to your
  credential — a repeat returns the original outcome instead of double-posting, and the same key used by
  another calling system never collides with yours.
- **Nothing is ever erased.** There is no delete route anywhere in this service. A mistake is corrected
  by writing an opposing posting, so the original and the correction both stay readable and attributable.
- **Two systems can be reconciled.** Every system integrating here agrees on what a posting is, what a
  balance means, and how a stream is ordered — which is the thing per-system bookkeeping can never give
  you.
- **Nobody gets to lie about who they are.** The calling system stamped on every posting comes from the
  credential, never from the request body.

## 🚀 Quick Start

**Prerequisites:** .NET SDK 10 (pinned in `global.json`), Docker (for PostgreSQL and Redis), and a JWT
bearer issuer your instance trusts.

```bash
# Restore and build
dotnet restore DKNet.Accounts.sln
dotnet build DKNet.Accounts.sln -c Release

# Run everything — Aspire provisions PostgreSQL and Redis and starts the API
dotnet run --project ApiEndpoints/DKNet.Accounts.AppHost

# …or run the API alone against a PostgreSQL you supply
ConnectionStrings__AppDb="Host=localhost;Port=5432;Database=accounts;Username=postgres;Password=postgres" \
  dotnet run --project ApiEndpoints/DKNet.Accounts.Api

# Tests: xUnit/Shouldly unit + integration, and the Reqnroll acceptance scenarios
dotnet test DKNet.Accounts.sln --settings coverage.runsettings
```

The `Development` profile turns authorization off, turns OpenAPI on, and migrates the database on start
(`ApiEndpoints/DKNet.Accounts.Api/appsettings.Development.json`). Health is on `/healthz`; the OpenAPI
document is on `/openapi/v1.json`.

Your first call — the reference currencies, which need only `accounts.read`:

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/v1/currencies
```

```json
[{"code":"SGD","decimalPlaces":2},{"code":"USD","decimalPlaces":2},{"code":"JPY","decimalPlaces":0}]
```

Everything else starts at [docs/integration-guide.md](docs/integration-guide.md).

## 🧩 Features

The service offers four capability areas. Each owns one record type, and every field of each is listed
below — an integrator should never need to read the code to know what a field means.

### Reference currencies — what the service can denominate

The service knows which currencies it supports and how many decimal places each is legally denominated
to. That precision is enforced on every posting amount. The set is fixed reference data, read through
`GET /v1/currencies`.

| Field | Type | Meaning |
|---|---|---|
| `code` | string | ISO 4217 alphabetic code — `SGD`, `USD`, `JPY` at this commit. |
| `decimalPlaces` | integer | How many decimal places the currency legally has. An amount finer than this is refused. |

### Account groups — the bucket accounts belong to

A named, uniquely coded bucket that accounts sit inside, classified by what it represents, carrying its
own owner identifier and metadata, and optionally pointing at a parent group. Groups can be listed and
filtered, re-named, re-parented, closed, and their balances read one line per currency.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid | Service-generated identifier. The one you use on every other group route. |
| `code` | string (≤50) | Your own unique code for the group. Unique across the service; a duplicate is refused. |
| `name` | string (≤200) | Human-readable name. |
| `description` | string? | Free-text description. |
| `type` | enum | What the group represents: `Customer`, `Merchant`, `Internal`, `Suspense`, `Settlement`. Fixed at creation. |
| `status` | enum | `Active` or `Closed`. Closing is refused while any account it holds carries a balance. |
| `ownerId` | string (≤100) | Your own identifier for whoever owns this group — a customer id, a merchant id, a cost centre. |
| `parentId` | uuid? | The group this one sits under. A change that would make a group its own ancestor is refused. |
| `metadata` | map<string,string>? | Free-form key/value pairs. Keys round-trip verbatim. |

A group's balances are a separate read (`GET /v1/account-groups/{id}/balances`), returning one line per
currency:

| Field | Type | Meaning |
|---|---|---|
| `currency` | string | The currency this line totals. |
| `balance` | decimal | The sum of the group's own accounts in that currency. Never combined across currencies, never rolled up from child groups. |

### Accounts — where a balance lives

An account sits inside exactly one group, in exactly one currency, with an accounting classification
that fixes which side of the ledger increases it. It carries its balance, the controls that bound how
far it may fall, and its position in its own posting stream.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid | Service-generated identifier, used on every other account route. |
| `accountNumber` | string (≤32) | Service-generated number, unique across the service (e.g. `ACC0000000001`). |
| `groupId` | uuid | The group this account belongs to. An account belongs to exactly one. |
| `name` | string (≤200) | Human-readable name. |
| `currency` | string | The account's currency. Fixed at opening and never changeable once the account has any posting. |
| `classification` | enum | `Asset`, `Liability`, `Equity`, `Income` or `Expense` — fixes which side of the ledger a credit increases. |
| `status` | enum | `Active`, `Frozen`, `Dormant` or `Closed`. Governs which postings the account will accept. |
| `balance` | decimal | The current balance — always the signed sum of this account's postings. |
| `availableBalance` | decimal | Balance minus held funds. Always equal to `balance` while held funds are deferred. |
| `heldAmount` | decimal | Funds reserved but not yet settled. Always `0` while held funds are deferred. |
| `overdraftLimit` | decimal? | How far below zero the account may go. Required when `permittedToGoNegative` is true. |
| `minimumBalance` | decimal? | A floor the account may not fall below. Binds over a looser overdraft limit. |
| `permittedToGoNegative` | bool | Whether the account may hold a negative balance at all. Setting it without an overdraft limit is refused. |
| `streamPosition` | integer | The highest position reached in this account's posting stream — `0` on a fresh account. |
| `lastPostedOn` | timestamp? | When the account was last posted to. Absent until the first posting. |
| `externalReference` | string (≤200)? | Your own reference for this account. |
| `metadata` | map<string,string>? | Free-form key/value pairs. |
| `openedOn` | timestamp | When the account was opened. |
| `closedOn` | timestamp? | When the account was closed. Absent while it is not closed. |

`GET /v1/accounts/{id}/balance` is the narrow read of the same three money fields plus the currency:
`currency`, `balance`, `availableBalance`, `heldAmount`.

### Postings — the append-only ledger

A posting is a single credit or debit against one account. Several movements can be recorded as one
all-or-nothing batch. A posting is never edited or deleted; it is corrected by a reversal, which is
itself a posting.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid | Service-generated identifier. |
| `postingNumber` | string | Service-generated number, unique across the service. |
| `accountId` | uuid | The account this posting moves. |
| `streamPosition` | integer | This posting's position in that account's stream — unique and gapless, so a missing entry is detectable. |
| `direction` | enum | `Credit` or `Debit`. The direction, not the sign of the amount, says which way money moved. |
| `amount` | decimal | Always strictly positive, never finer than the currency permits. |
| `currency` | string | Always equal to the account's currency. |
| `signedAmount` | decimal | The amount resolved against the account's ledger side — this is what sums to the balance. |
| `balanceAfter` | decimal | The account's balance immediately after this posting. |
| `effectiveDate` | date | The date the movement takes effect. May be backdated; never later than the recording date. |
| `recordedAt` | timestamp | The moment the service recorded it. |
| `category` | enum | `Transfer`, `Payment`, `Fee`, `Interest`, `Adjustment`, `Refund`, `Reversal`, `OpeningBalance`. |
| `status` | enum | `Posted`, or `Reversed` once a reversal has been written against it. |
| `reversesPostingId` | uuid? | The posting this one reverses. Set only on a reversal. |
| `reversedByPostingId` | uuid? | The posting that reversed this one. Set once, never cleared. |
| `transactionGroupId` | uuid? | Ties the legs of one logical transaction together. Every movement in a batch shares one. |
| `counterpartyAccountId` | uuid? | The other side, when it is an account inside this service. |
| `counterpartyReference` | string? | The other side, when it is outside this service. |
| `callingSystem` | string | The system that recorded this posting. Taken from the credential, never from the request body. |
| `idempotencyKey` | string? | The key that calling system supplied. Scoped to that system. |
| `externalReference` | string? | Your own reference for this posting. |
| `description` | string? | Narrative description. |
| `metadata` | map<string,string>? | Free-form key/value pairs. |

### The API contract

Every route sits under `/v1`, needs an authenticated machine identity, and needs the scope in the last
column. There is **no delete route anywhere in this service, for any resource.**

| Method | Route | What it does | Scope | Refused when |
|---|---|---|---|---|
| `GET` | `/v1/currencies` | List supported currencies and their decimal places | `accounts.read` | — |
| `POST` | `/v1/account-groups` | Create a group. Body: `code`, `name`, `type`, `ownerId`, optional `description`, `parentId`, `metadata`. Returns `201` + the group | `accounts.write` | `code` already used (`DUPLICATE_GROUP_CODE`) |
| `GET` | `/v1/account-groups` | List groups, filterable by `code`, `type`, `status`, `parentId`, paged by `pageIndex`/`pageSize` | `accounts.read` | — |
| `GET` | `/v1/account-groups/{id}` | Read one group | `accounts.read` | Unknown id → `404` |
| `PATCH` | `/v1/account-groups/{id}` | Change `name`, `description`, `status`, `parentId`, `metadata`. `{"status":"Closed"}` closes the group | `accounts.write` | An account it holds carries a balance (`GROUP_HOLDS_BALANCE`); the re-parent would create a cycle (`GROUP_CYCLE`); unknown id → `404` |
| `GET` | `/v1/account-groups/{id}/balances` | Group totals, one line per currency | `accounts.read` | — |
| `POST` | `/v1/accounts` | Open an account. Body: `groupId`, `name`, `currency`, `classification`, `permittedToGoNegative`, optional `overdraftLimit`, `minimumBalance`, `externalReference`, `metadata`. Returns `201` + the account | `accounts.write` | Negative permitted with no overdraft limit (`OVERDRAFT_LIMIT_REQUIRED`); currency not supported (`UNSUPPORTED_CURRENCY`) |
| `GET` | `/v1/accounts` | List accounts, filterable by `groupId`, `currency`, `status`, paged by `pageIndex`/`pageSize` | `accounts.read` | — |
| `GET` | `/v1/accounts/{id}` | Read one account | `accounts.read` | Unknown id → `404` |
| `GET` | `/v1/accounts/{id}/balance` | Read the balance alone | `accounts.read` | Unknown id → `404` |
| `PATCH` | `/v1/accounts/{id}` | Change `name`, `status`, `overdraftLimit`, `minimumBalance`, `metadata`. `{"status":"Closed"}` closes it; `{"status":"Active"}` reopens it | `accounts.write` | Closing while it holds a balance or a held amount (`ACCOUNT_HOLDS_BALANCE`); a floor-less control combination (`OVERDRAFT_LIMIT_REQUIRED`); unknown id → `404` |
| `GET` | `/v1/accounts/{id}/statement` | Date-bounded, paged statement in stream order. Query: `from`, `to`, `pageIndex`, `pageSize` | `postings.read` | — (past the end returns an empty page, never an error) |
| `POST` | `/v1/postings` | Record one credit or debit. `Idempotency-Key` header. Returns `201` + the posting | `postings.write` | Every posting refusal below |
| `POST` | `/v1/postings/batch` | Record several movements as one all-or-nothing batch. `Idempotency-Key` header | `postings.write` | Any one movement's refusal refuses the whole batch and records nothing |
| `GET` | `/v1/postings/{id}` | Read one posting | `postings.read` | Unknown id → `404` |
| `POST` | `/v1/postings/{id}/reverse` | Reverse a posting | `postings.reverse` | Already reversed (`POSTING_ALREADY_REVERSED`); the account's status does not accept a movement in the reversal's own direction |

**Authentication.** JWT bearer, machine-to-machine only, default-deny — any route not explicitly
anonymous needs an authenticated caller. The calling system's identity is read from the credential's
`client_id` claim; a `recordedBy` field in a request body is ignored, not rejected. Scopes are read from
the `scp` or `scope` claim (space-separated) and are per operation class:

| Scope | Grants |
|---|---|
| `accounts.read` | Read currencies, groups, accounts and balances |
| `accounts.write` | Create and change groups and accounts |
| `postings.read` | Read postings and statements |
| `postings.write` | Record postings and batches |
| `postings.reverse` | Reverse a posting |

Read never implies write, and posting never implies reversing.

**Idempotency.** `POST /v1/postings` and `POST /v1/postings/batch` take an `Idempotency-Key` request
header. The key is scoped to `(calling system, key)`, so two systems may reuse the same key
independently. Same key with the same content returns the original outcome with `200` and records
nothing new; same key with different content is refused `409 IDEMPOTENCY_KEY_CONFLICT`.

**Statement paging.** Pages partition the stream: every posting in the requested date range appears
exactly once, in stream order, none duplicated and none skipped. Reading past the end returns an empty
page with `200`, never an error.

### Refusals and error codes

A business-rule refusal is `422 Unprocessable Entity` with an RFC 7807 `application/problem+json` body
carrying a stable machine-readable `code`. `401` and `403` have empty bodies.

| HTTP | `code` | Condition |
|---|---|---|
| `401` | — | No or invalid credential |
| `403` | — | Credential lacks the scope for this operation class |
| `404` | — | The resource id does not exist |
| `409` | `IDEMPOTENCY_KEY_CONFLICT` | Same idempotency key, different content |
| `422` | `INVALID_POSTING_AMOUNT` | **Both amount refusals share this one code:** the amount is ≤ 0, *or* it has more decimal places than the currency permits. The two conditions are not distinguishable from the `code` — read `detail` if you need to tell them apart |
| `422` | `CURRENCY_MISMATCH` | Posting currency ≠ account currency |
| `422` | `EFFECTIVE_DATE_IN_FUTURE` | Effective date later than the recording date |
| `422` | `INSUFFICIENT_FUNDS` | A debit would take the account past its floor. Never raised for a reversal |
| `422` | `OVERDRAFT_LIMIT_REQUIRED` | Account permitted to go negative with no overdraft limit, at open or at update |
| `422` | `ACCOUNT_FROZEN` | Any posting against a frozen account, including a reversal |
| `422` | `ACCOUNT_DORMANT_DEBIT_REFUSED` | A debit against a dormant account, including a debiting reversal |
| `422` | `ACCOUNT_CLOSED` | Any posting against a closed account, including a reversal |
| `422` | `ACCOUNT_HOLDS_BALANCE` | Close requested while the balance or held amount ≠ 0 |
| `422` | `GROUP_HOLDS_BALANCE` | Group close requested while an account it holds carries a balance |
| `422` | `GROUP_CYCLE` | A parent change would make a group its own ancestor |
| `422` | `POSTING_ALREADY_REVERSED` | Reverse requested on an already-reversed posting |
| `422` | `DUPLICATE_GROUP_CODE` | A group already exists with that code |
| `422` | `UNSUPPORTED_CURRENCY` | The currency is not in the reference set |
| `422` | `LOCK_TIMEOUT` | The service waited 10 seconds for this account's posting lock and gave up. Nothing was recorded — retry, reusing the same `Idempotency-Key` |

Every code above is a constant in `ApiEndpoints/DKNet.Accounts.AppServices/Share/LedgerErrors.cs`; that
file is the authority if this table and the service ever disagree.

### Invariants the service guarantees

Each of these holds at all times and is independently assertable from outside the service — you can
write a test for every one of them against your own integration.

- **The ledger is append-only.** A recorded posting is never altered and never removed. The one
  permitted mutation is a posting's one-way transition to `Reversed` together with the back-reference to
  the posting that reversed it, applied exactly once. Correction is by writing an opposing posting,
  never by editing or deleting.
- **A posting amount is always strictly positive.** Its `direction`, not its sign, says which way the
  money moved.
- **A posting amount never carries more decimal places than its currency permits.** `10.555 USD` is
  refused; USD is denominated to two places.
- **A posting's currency always equals its account's currency**, and an account's currency can never
  change once it has any posting.
- **An account's balance always equals the signed sum of that account's postings.** This is a property
  you can verify, not an internal bookkeeping detail.
- **Each posting occupies a unique, gapless position in its account's stream**, so a consumer reading
  the stream can detect a missing entry.
- **A request that repeats your idempotency key returns the original outcome and changes nothing.** The
  same key carrying different content is refused rather than guessed at.
- **No posting is ever lost under concurrency.** When several postings are recorded against one account
  at the same moment, every one is either recorded or refused with a stated reason; none is silently
  dropped or overwritten, and the balance still equals the signed sum of those that were recorded.
- **Every account has exactly one determinate floor, and a debit that would take it past that floor is
  refused and records nothing** — save for a reversal, which is exempt (see below). The floor is the
  **most restrictive** of the controls set on the account: an account not permitted to go negative has a
  floor of zero, or of its minimum balance where that is higher; an account permitted to go negative has
  a floor of its overdraft limit below zero, or of its minimum balance where that is higher. Permitting
  an account to go negative *without* stating how far is refused at configuration, so no account can
  ever be left without a floor.
- **A reversal is never refused for want of funds, but is never exempt from account status.** It is the
  one movement exempt from the floor, because the floor exists to stop new exposure while a reversal only
  withdraws a record that should not have stood — refusing it would make some mistakes permanently
  uncorrectable, which the append-only rule forbids. A reversal may therefore leave an account below its
  floor, and that resulting position is a real debt you can read. Every other control still applies,
  **including the account's status: a reversal is refused wherever that status does not accept a movement
  in the reversal's own direction.** A closed or frozen account accepts nothing, so either must be
  returned to a status that accepts postings before a mistake against it can be corrected. A dormant
  account accepts credits only, so it takes a reversal that *credits* it and refuses one that *debits* it
  until it is made active again. Nothing becomes permanently uncorrectable, because returning an account
  to a status that accepts postings is an explicit, attributable act available at any time.
- **A closed account accepts no posting, and an account cannot be closed while it holds any balance or
  any held amount.** A frozen account accepts nothing in either direction; a dormant account accepts
  credits only.
- **A group cannot be closed while any account it holds carries a balance**, and a group can never be
  its own ancestor.
- **A posting can be reversed at most once**, and its reversal carries the identical amount in the
  opposite direction, dated the day it is written rather than the date the original took effect.
- **A posting's effective date is never later than the date it is recorded.** Leave it unset and it is
  the recording date; you may backdate it; the service refuses a future date. Because a statement is
  returned in stream order and not in effective-date order, **a backdated posting appears at the position
  it was recorded at**, not among the postings whose effective dates surround it.
- **A statement is read in pages, and the pages partition the stream.** Reading a date-bounded statement
  page by page returns every posting in that range exactly once, in stream order, with no posting seen
  twice and none skipped, and reading past the end returns an empty page rather than an error.
- **Balances across different currencies are never summed together.**
- **While held funds are deferred, an account's held amount is always zero and its available balance
  always equals its current balance**, so reading either field gives you a defined answer in this
  delivery.

## ⚙️ Configuration reference

Feature flags live under the `FeatureManagement` section; the JSON keys match the property names in
`ApiEndpoints/DKNet.Accounts.Share/Options/FeatureOptions.cs` one for one. Defaults below are the
shipped `appsettings.json` values.

| Setting | Type | Default | Effect |
|---|---|---|---|
| `ConnectionStrings:AppDb` | string | — | PostgreSQL connection string. Required. |
| `ConnectionStrings:AzureBus` | string | empty | Azure Service Bus connection. Left empty, only the in-memory bus is wired. |
| `Authentication:Schemes:Bearer:MetadataAddress` | string | placeholder | OIDC metadata address of your token issuer. Must be set for a real deployment. |
| `Authentication:Schemes:Bearer:ValidIssuer` | string | placeholder | Accepted token issuer. |
| `Authentication:Schemes:Bearer:ValidAudiences` | string[] | placeholder | Accepted token audiences. |
| `FeatureManagement:RequireAuthorization` | bool | `true` | Enforces the per-route scope policies. Off only for local development. |
| `FeatureManagement:EnableSwagger` | bool | `false` | Maps `/openapi/v1.json`. On in `Development`. |
| `FeatureManagement:RunDbMigrationWhenAppStart` | bool | `false` | Applies EF Core migrations at start-up. On in `Development`. |
| `FeatureManagement:EnableHttps` | bool | `true` | HTTPS redirection and HSTS. |
| `FeatureManagement:EnableRateLimit` | bool | `true` | Per-caller rate limiting, configured under `RateLimit`. |
| `FeatureManagement:EnableServiceBus` | bool | `true` | External Service Bus wiring. The in-memory bus is always wired regardless. |
| `FeatureManagement:EnableVersioning` | bool | `true` | The `/v1` URL segment. |
| `FeatureManagement:EnableSecurityHeaders` | bool | `true` | Security response headers. |
| `FeatureManagement:EnableRequestBounds` | bool | `true` | Request timeout and body-size limits, configured under `RequestBounds`. |
| `RequestBounds:MaxRequestBodySizeBytes` | int | `1048576` | Largest accepted request body — relevant when sizing a posting batch. |
| `RateLimit:DefaultRequestLimit` | int | `100` | Requests per `TimeWindowInSeconds` per caller. |

Every setting a generated solution reads is catalogued in
[docs/configuration-reference.md](docs/configuration-reference.md).

## 🧱 Where it fits

This service is **the book of record** for the balances it holds — not a mirror of an upstream core
banking ledger. Downstream systems (payments, wallets, settlement, billing) perform their own business
and then record the *result* here.

It deliberately does **not** own:

- **Payments and settlement** — you move the money; you record here that it moved.
- **KYC and customer onboarding** — a group's `ownerId` points at your customer record; this service
  does not hold one.
- **Interest, fees and currency conversion** — permanently out of scope. You compute them and record
  the resulting posting.

### Decisions on record

Confirmed by drunkcoding on 2026-09-14:

- Postings are recorded **one per account movement**, with an optional identifier grouping the legs of
  one logical transaction. This leaves a schema-compatible path to enforced double-entry later.
- This service is the **book of record** for the balances it holds, not a mirror of an upstream ledger.
- **One currency per account.** A multi-currency holding is several accounts in one group.
- **Negative balances are refused by default**, permitted per account by an explicit overdraft limit or
  an explicit opt-in.
- **Held funds are out of the first delivery** — the fields exist, the behaviour does not.
- **Machine-to-machine credentials only**, authorised per operation class.
- **Postings are retained online indefinitely**; there is no archival in this delivery.
- Designed for **fewer than one hundred postings per second**.
- **Group hierarchy is represented but roll-up balance queries are not built.**
- **Any caller authorised to reverse may reverse**, with no time window, because both the original and
  the reversal remain readable.

Derived by the product owner on 2026-09-14 to close gaps the confirmed set left. These are **derived,
not confirmed by drunkcoding, and remain open to correction:**

- **The most restrictive floor wins** where more than one floor control is set on an account.
- **Permitting an account to go negative without an overdraft limit is refused** at configuration, so no
  account is ever left without a determinate floor.
- **A reversal is exempt from the account's floor but not from the account's status.**
- **An effective date may be backdated but never future-dated.**

## ⚠️ Gotchas & limits

**Held funds are deferred, and the fields lie in wait, not in use.** `heldAmount` is always `0` and
`availableBalance` always equals `balance`. Do not build a reservation flow on those fields yet — the
fields exist so the addition is purely behavioural later, and the trigger for adding it is a caller
needing to reserve funds ahead of settling.

**Other deferred items, with the trigger for adding each:**

| Deferred | Added when |
|---|---|
| Daily closing snapshots | Statement volume makes reading the stream too slow, or an audit demands an immutable daily close |
| Consolidated parent-group balances | Someone asks. Group hierarchy is represented; roll-up reads are not built |
| Outbound change notifications | A downstream needs push rather than poll |
| Interest, fees and currency conversion | Never — permanently out. Compute them and record the result here |

**Casing is asymmetric.** Requests accept enum values in the PascalCase spelling used throughout this
readme (`"Customer"`, `"Liability"`, `"Credit"`); responses return them camelCase (`"customer"`,
`"liability"`, `"credit"`). Match on a case-insensitive comparison rather than a literal.

**Null fields are omitted from responses.** The serializer drops nulls, so an account with no
`overdraftLimit` has no `overdraftLimit` key at all rather than a `null` one. Treat absence as null.

**The three paged reads do not all have the same response shape.** Two return a bare array, one returns
an envelope:

| Paged read | Response shape | How you know you are past the end |
|---|---|---|
| `GET /v1/accounts` | Bare JSON array of accounts — no total, no page count, no `hasNextPage` | The array comes back empty (`[]`). Increment `pageIndex` until it does; do not compute a page count and stop on it |
| `GET /v1/account-groups` | Bare JSON array of groups — same, no envelope | The array comes back empty (`[]`), same loop |
| `GET /v1/accounts/{id}/statement` | Envelope: `{ "items": [...], "pageNumber", "pageSize", "pageCount", "totalItemCount", "hasNextPage", "hasPreviousPage" }` | Either `hasNextPage` is `false` or `items` is empty. The empty page still answers `200`, never an error — reading `items` and stopping when it is empty works here too, and is the loop the acceptance suite runs |

Pages are 1-based (`pageIndex=1` is the first page) on all three.

**A statement is in stream order, never date order.** If you backdate a posting, it appears where it was
recorded. Sort client-side by `effectiveDate` if that is what your reader needs — and remember the
balance-after column only makes sense in stream order.

**There is no way to delete anything.** A compromised credential can add attributable, reversible
entries; it can never erase evidence of what it did. Plan corrections, not clean-up.

**Known deviations from the `[D1242-1]` §5 baseline contract at this commit.** These are reported on
DRK-1248 for the squad to resolve; the tables above describe what the code actually does:

- Routes are served under `/v1/...`, not the `/api/v1/...` that §5 tables.
- The paging parameter is `pageIndex` on all three paged reads, not §5's `page`.
- **Four §5 refusal codes are spelled differently here, and two of them collapse onto one code.** The
  [table above](#refusals-and-error-codes) is what the service emits; §5's names are listed here only so
  you can recognise them if you are reading the baseline contract:

  | §5 names | Service emits |
  |---|---|
  | `ACCOUNT_HAS_BALANCE` | `ACCOUNT_HOLDS_BALANCE` |
  | `GROUP_HAS_BALANCE` | `GROUP_HOLDS_BALANCE` |
  | `AMOUNT_NOT_POSITIVE` | `INVALID_POSTING_AMOUNT` |
  | `AMOUNT_PRECISION_EXCEEDED` | `INVALID_POSTING_AMOUNT` — one code covers both amount refusals, so they cannot be told apart from the `code` alone |
  | `FLOOR_BREACHED` | `INSUFFICIENT_FUNDS` |

  The service also emits three codes §5 does not list at all: `DUPLICATE_GROUP_CODE`,
  `UNSUPPORTED_CURRENCY` and `LOCK_TIMEOUT`.
- §5 says the statement response "states when the end of the stream has been reached". The statement
  does (`hasNextPage`); `GET /v1/accounts` and `GET /v1/account-groups` do not — they are bare arrays,
  and an empty page is their only end-of-stream signal.

## 🔗 Related docs

- [Integration guide](docs/integration-guide.md) — the end-to-end walkthrough, with real payloads.
  Reach for this first if you are integrating.
- [docs/index.md](docs/index.md) — the reference docs inherited from the DKNet solution template
  (pipeline, configuration, EF Core events, messaging). Reach for these when you are changing this
  service, not when you are calling it.
- [AGENTS.md](AGENTS.md) — the architecture conventions this solution is held to.

## License

[MIT](LICENSE).
