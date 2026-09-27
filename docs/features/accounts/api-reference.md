# Accounts — API Reference

**Base path**: `/v1/accounts` · **Auth**: Bearer token, scope named per route below ·
**Content-Type**: `application/json`

Only `GetList`, `GetById` and rename/metadata (`ChangeDetails`) come from the generated composite
(`group.MapAccountCrud(o => o.Exclude(CrudOp.Delete))`) — accounts publish no delete route at all.
Every other route below is hand-mapped. The full error-code and refusal-body contract is in
[the README](../../../README.md#refusals-and-error-codes); this page states only what applies to this
slice. The statement route is documented here because it is mapped on this group, but its data comes
from [Postings](../postings/README.md).

## Endpoints Summary

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| `POST` | `/v1/accounts` | Open an account | `accounts.write` |
| `GET` | `/v1/accounts` | List accounts (filter/search/order/page) | `accounts.read` |
| `GET` | `/v1/accounts/status-counts` | Count accounts by status | `accounts.read` |
| `GET` | `/v1/accounts/balances` | Ledger-wide balances by currency | `accounts.read` |
| `GET` | `/v1/accounts/{id}` | Read one account | `accounts.read` |
| `PUT` | `/v1/accounts/{id}` | Change name/metadata | `accounts.write` |
| `GET` | `/v1/accounts/{id}/balance` | The three money fields plus currency and floor | `accounts.read` |
| `PATCH` | `/v1/accounts/{id}` | Change status/overdraft limit/minimum balance/permitted-negative | `accounts.write` |
| `GET` | `/v1/accounts/{id}/statement` | Date-bounded, paged posting statement | `postings.read` |

---

## `POST /v1/accounts`

Opens an account. **Entirely hand-written** — `Account` carries no `[CrudCreate]` constructor.

- **Auth:** `accounts.write`
- **Idempotency:** not idempotent — a retry opens a second account unless a caller-chosen
  `accountNumber` suffix repeats, which is refused by the unique index (`409`)
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `groupId` | uuid | ✓ | must resolve to an existing group | body |
  | `accountNumber` | string | — | caller's own 3–10 character suffix; stored as `{group code}-{suffix}`. **Not documented in the root README's Open-account row** — see this page's note in the delivering report. Omitted, a 10-digit suffix is generated | body |
  | `name` | string | ✓ | non-empty, ≤ 200 characters | body |
  | `currency` | string | ✓ | must resolve to an active currency | body |
  | `classification` | enum | ✓ | `Asset`, `Liability`, `Equity`, `Income`, `Expense` | body |
  | `permittedToGoNegative` | bool | ✓ | if `true`, `overdraftLimit` becomes required | body |
  | `overdraftLimit` | decimal | — | required when `permittedToGoNegative` is `true`; decimal places ≤ currency's | body |
  | `minimumBalance` | decimal | — | decimal places ≤ currency's | body |
  | `externalReference` | string | — | ≤ 200 characters | body |
  | `metadata` | map\<string,string\> | — | round-trips verbatim | body |

- **Response:** `201 Created` — `AccountDto`, `status: "Active"`, `balance: 0`
- **Errors:** `422 UNSUPPORTED_CURRENCY` (unknown or inactive currency) · `422 OVERDRAFT_LIMIT_REQUIRED`
  · `404` unknown group · `400` malformed body · `409` a caller-chosen suffix already used with this
  group's code
- **Enforcement:** FluentValidation, enforced

```bash
curl -X POST "https://accounts.example.com/v1/accounts" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"groupId":"b85813c0-3053-4d35-a0ef-3f2863f83fa9","name":"Acme Operating — SGD","currency":"SGD","classification":"Asset","permittedToGoNegative":false}'
```

## `GET /v1/accounts`

Generated `MapGetList<Account, Guid, AccountDto>()` route. Full contract:
[Generic List Endpoint](../../generic-list-endpoint.md); this service's queryable fields, defaults and
the `CurrencyCode`-vs-`Currency` trap: [the README](../../../README.md#listing-groups-and-accounts).

- **Auth:** `accounts.read`
- **Response:** `200 OK` — `PagedResponse<AccountDto>`
- **Errors:** `400` unknown filter/order field

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/accounts?filter=GroupId:Equal:{groupId}"
```

## `GET /v1/accounts/status-counts`

Generic `MapGetStatusCounts<Account>` helper.

- **Auth:** `accounts.read`
- **Request:** `from`/`to` (RFC 3339, optional) — narrows by `CreatedOn`
- **Response:** `200 OK` — `[{ status, count }]`, every `AccountStatus` value included even at zero
- **Errors:** `400` a narrowing other than the date window

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/accounts/status-counts"
```

## `GET /v1/accounts/balances`

Hand-written aggregation (`GetLedgerBalancesQueryHandler`): every account across every group, grouped
by `CurrencyCode`.

- **Auth:** `accounts.read`
- **Response:** `200 OK` — `[{ currency, balance, available, held }]` — one line per currency across
  the whole ledger, currencies never combined
- **Errors:** none beyond auth

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/accounts/balances"
```

## `GET /v1/accounts/{id}`

- **Auth:** `accounts.read`
- **Response:** `200 OK` — `AccountDto`
- **Errors:** `400` malformed id · `404` unknown id

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/accounts/{id}"
```

## `PUT /v1/accounts/{id}`

Changes `name` and/or `metadata` only — generated route (`ChangeDetails`, `[CrudUpdate]`), hand-written
validator.

- **Auth:** `accounts.write`
- **Request:** `name` (string, ≤ 200, when supplied), `metadata` (map, optional) — at least one required
- **Response:** `200 OK` — `AccountDto`
- **Errors:** `400` no member supplied, or malformed id · `404` unknown id
- **Enforcement:** FluentValidation, enforced

```bash
curl -X PUT "https://accounts.example.com/v1/accounts/{id}" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Acme Operating — SGD (renamed)"}'
```

## `GET /v1/accounts/{id}/balance`

Narrow read: the three money fields plus currency and the account's live floor.

- **Auth:** `accounts.read`
- **Response:** `200 OK` — `{ currency, balance, availableBalance, heldAmount }`. `heldAmount` is
  always `0` and `availableBalance` always equals `balance` in this delivery
- **Errors:** `404` unknown id

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/accounts/{id}/balance"
```

## `PATCH /v1/accounts/{id}`

Changes `status`, `overdraftLimit`, `minimumBalance` and `permittedToGoNegative` **only** — rename and
metadata are on `PUT`, not here.

- **Auth:** `accounts.write`
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `status` | enum | — | any of `Active`, `Frozen`, `Dormant`, `Closed`; a member left out is unchanged | body |
  | `overdraftLimit` | decimal | — | re-checked against the merged floor state | body |
  | `minimumBalance` | decimal | — | decimal places ≤ currency's | body |
  | `permittedToGoNegative` | bool | — | re-checked against the merged floor state | body |

- **Response:** `200 OK` — `AccountDto`
- **Errors:** `422 ACCOUNT_HOLDS_BALANCE` — closing while balance or held amount is non-zero ·
  `422 OVERDRAFT_LIMIT_REQUIRED` — the merged permission/limit leaves no determinate floor ·
  `404` unknown id
- **Enforcement:** FluentValidation, enforced

```bash
curl -X PATCH "https://accounts.example.com/v1/accounts/{id}" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"Closed"}'
```

## `GET /v1/accounts/{id}/statement`

Mapped on this endpoint group (`AccountsV1Endpoint.cs`) but documented in full under
[Postings' API reference](../postings/api-reference.md#get-v1accountsidstatement) — it reads the
posting stream, not the account record, and requires `postings.read` rather than this group's
default `accounts.read`.

## Common Error Response Format

Every non-2xx response is `application/problem+json` — `title`, `status`, `type`, `traceId`, and an
`errors[]` list of `{ message, code, field }`. Full shape and the complete refusal-code table:
[the README](../../../README.md#refusals-and-error-codes).
