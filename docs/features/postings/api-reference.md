# Postings — API Reference

**Base path**: `/v1/postings` · **Auth**: Bearer token, scope named per route below ·
**Content-Type**: `application/json`

Only `GET /v1/postings/{id}` is generated (`MapGetById<Posting, Guid, PostingDto>`); every other route
below — including the statement route, mapped on the accounts endpoint group — is hand-written. The
full error-code and refusal-body contract is in
[the README](../../../README.md#refusals-and-error-codes); this page states only what applies to this
slice.

## Endpoints Summary

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| `GET` | `/v1/postings` | List postings across every account, within a required date window | `postings.read` |
| `POST` | `/v1/postings` | Record one credit or debit | `postings.write` |
| `POST` | `/v1/postings/batch` | Record several movements as one all-or-nothing batch | `postings.write` |
| `GET` | `/v1/postings/{id}` | Read one posting | `postings.read` |
| `POST` | `/v1/postings/{id}/reverse` | Reverse a posting | `postings.reverse` |
| `GET` | `/v1/accounts/{id}/statement` | Date-bounded, paged statement for one account, in stream order | `postings.read` |

---

## `GET /v1/postings`

Hand-mapped: explicit query parameters, not `[AsParameters]` — the endpoint file notes this is a
deliberate minimal-API binding-trap avoidance, not an oversight. Validated explicitly against an
injected `IValidator<ListPostingsQuery>` before the query runs.

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
  | `pageNumber` / `pageSize` | int | — | same paging contract as [the generic list endpoint](../../generic-list-endpoint.md) | query |

- **Response:** `200 OK` — `PagedResponse<PostingDto>`
- **Errors:** `422 INVALID_DATE_RANGE` — no window, or one wider than 90 days · `400` an unrecognised
  `orderBy`/`direction`/`category`/`status` value, or a `search` under 2 characters

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://accounts.example.com/v1/postings?from=2026-06-01&to=2026-06-30&direction=Credit"
```

## `POST /v1/postings`

Records one credit or debit. Full flow: [architecture.md](architecture.md#record-a-posting--sequence-diagram).

- **Auth:** `postings.write`
- **Idempotency:** `Idempotency-Key` declared `[FromRequestHeader]` — published as a header parameter
  on the operation itself, not read by hand from `HttpRequest.Headers`. **Optional** — omitting it
  skips the replay/conflict check entirely, so a retry with no key records a second posting. When
  supplied: same key, same content → `200` with the original posting, nothing new recorded; same key,
  different content → `409 IDEMPOTENCY_KEY_CONFLICT`. A key placed in the request body instead is
  discarded — the header source overwrites it before validation
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
- **Errors:** `422 UNSUPPORTED_CURRENCY` · `422 INVALID_POSTING_AMOUNT` · `422 EFFECTIVE_DATE_IN_FUTURE`
  · `422 CURRENCY_MISMATCH` · `422 ACCOUNT_CLOSED` · `422 ACCOUNT_FROZEN` ·
  `422 ACCOUNT_DORMANT_DEBIT_REFUSED` · `422 INSUFFICIENT_FUNDS` · `422 AMOUNT_OUT_OF_RANGE` ·
  `422 LOCK_TIMEOUT` (10-second per-account lock) · `409 IDEMPOTENCY_KEY_CONFLICT` (only reachable
  when a key was supplied)
- **Enforcement:** FluentValidation, enforced

```bash
curl -X POST "https://accounts.example.com/v1/postings" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 6e6f4d3c-1b7e-4c7a-9f1d-8a2b5c6d7e01" \
  -d '{"accountId":"3fa85f64-5717-4562-b3fc-2c963f66afa6","direction":"Credit","amount":100.00,"currency":"SGD","category":"Transfer"}'
```

## `POST /v1/postings/batch`

Records several movements as one all-or-nothing batch — nothing is persisted unless every movement
succeeds.

- **Auth:** `postings.write`
- **Idempotency:** `Idempotency-Key` declared `[FromRequestHeader]`, **optional** — same rule as
  `POST /v1/postings`: omit it and no replay/conflict check runs. When supplied, the content
  signature is computed over the whole batch — a key already used on a single posting is refused
  `409`, not replayed, if reused on a batch (and vice versa). The key is recorded on the batch's
  first leg only; the other legs come back with no `idempotencyKey` of their own
- **Request:** `movements` — a non-empty array of the same fields as `POST /v1/postings` (minus the
  header) — plus a top-level, optional `transactionGroupId`: when unset, one is generated so every
  movement in the batch still shares one
- **Locking:** every distinct `accountId` in the batch is locked in ascending id order, to avoid a
  cross-batch deadlock; a timeout on any lock releases every lock already acquired
- **Response:** `201 Created` — `PostingDto[]`, one per movement, sharing one `transactionGroupId`
  when the request set one
- **Errors:** any one movement's refusal (from the list above) refuses the whole batch and records
  nothing
- **Enforcement:** FluentValidation, enforced

```bash
curl -X POST "https://accounts.example.com/v1/postings/batch" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 2b7c1a4d-9e3f-4c6b-8a2d-1f5c6d7e8b03" \
  -d '{"movements":[{"accountId":"...","direction":"Debit","amount":100.00,"currency":"SGD","category":"Transfer"},{"accountId":"...","direction":"Credit","amount":100.00,"currency":"SGD","category":"Transfer"}]}'
```

## `GET /v1/postings/{id}`

The one generated route in this slice (`MapGetById<Posting, Guid, PostingDto>`).

- **Auth:** `postings.read`
- **Response:** `200 OK` — `PostingDto`
- **Errors:** `404` unknown id

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/postings/{id}"
```

## `POST /v1/postings/{id}/reverse`

Reverses a posting — mapped through the generic `MapActionById<ReversePostingRequest, Guid,
PostingDto>` (deliberately **not** `[CrudAction]`, since the handler is entirely hand-written). Full
flow: [architecture.md](architecture.md#reverse-a-posting--sequence-diagram).

- **Auth:** `postings.reverse`
- **Idempotency:** `Idempotency-Key` **required** header (unlike Record/RecordBatch, a reversal
  refuses outright if it is missing)
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `reason` | string | ✓ | 1–500 characters; recorded as the reversal's `description` | body |
  | `Idempotency-Key` | string | ✓ | required header | header |

- **Response:** `200 OK` — `PostingDto` (the new opposing posting)
- **Errors:** `400` missing `reason` or `Idempotency-Key` · `422 POSTING_ALREADY_REVERSED` — already
  reversed under a new key (a retry under the *same* key replays the earlier reversal with `200`
  instead) · `409 IDEMPOTENCY_KEY_CONFLICT` — same key, different reason · every status-gate refusal
  from `POST /v1/postings` still applies to the reversal's own direction · `422 AMOUNT_OUT_OF_RANGE` —
  the ceiling check is a storage limit, not a policy a reversal is exempt from, unlike the floor check
  · `422 LOCK_TIMEOUT`
- **Enforcement:** FluentValidation, enforced

```bash
curl -X POST "https://accounts.example.com/v1/postings/{id}/reverse" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 9c1b7e6f-4d3c-4a7c-8f1d-1a2b5c6d7e02" \
  -d '{"reason":"Posted against the wrong account"}'
```

## `GET /v1/accounts/{id}/statement`

Date-bounded, paged statement for one account, in stream order — never effective-date order, so a
backdated posting appears where it was recorded, not among the postings whose effective dates
surround it. Mapped on the accounts endpoint group
(`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs`) because it belongs to
that route's URL, but its data and handler (`GetAccountStatementQueryHandler`) belong to this slice.

- **Auth:** `postings.read` — overrides the accounts group's default `accounts.read` via
  `.RequireScope(group, ScopeNames.PostingsRead)`, because this is a read over postings, not over the
  account record
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `from` / `to` | date | — | inclusive bounds, no 90-day cap (unlike `GET /v1/postings`) | query |
  | `pageIndex` | int | — | default `1` — its own name, not the generic list contract's `pageNumber` | query |
  | `pageSize` | int | — | default `20` — its own default, not the generic list contract's `1000` | query |

- **Response:** `200 OK` — `PagedResponse<PostingDto>` in stream order. Reading past the end returns
  an empty page with `200`, never an error
- **Errors:** `404` for a non-GUID `{id}` — this route is mapped `{id:guid}`, so a malformed segment
  never matches the route at all. An **unknown but valid** id is not an error: the handler never looks
  the account up, so it answers `200` with an empty page, the same as a real account with no postings
  in the requested window

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://accounts.example.com/v1/accounts/{id}/statement?from=2026-06-01&to=2026-06-30"
```

## Common Error Response Format

Every non-2xx response is `application/problem+json` — `title`, `status`, `type`, `traceId`, and an
`errors[]` list of `{ message, code, field }`. Full shape and the complete refusal-code table:
[the README](../../../README.md#refusals-and-error-codes).
