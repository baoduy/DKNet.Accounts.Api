# Account Groups — API Reference

**Base path**: `/v1/account-groups` · **Auth**: Bearer token, scope named per route below ·
**Content-Type**: `application/json`

Seven routes (Create, GetList, GetById, Update, Delete, Activate, Close) are one composite
registration — `group.MapAccountGroupCrud(...)` — except Close, whose generated handler is replaced
by a hand-written one. `balances` and `status-counts` are hand-mapped beside it. The full error-code
and refusal-body contract is in [the README](../../../README.md#refusals-and-error-codes); this page
states only what applies to this slice.

## Endpoints Summary

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| `POST` | `/v1/account-groups` | Create a group | `accounts.write` |
| `GET` | `/v1/account-groups` | List groups (filter/search/order/page) | `accounts.read` |
| `GET` | `/v1/account-groups/{id}` | Read one group | `accounts.read` |
| `PUT` | `/v1/account-groups/{id}` | Update name/description/metadata | `accounts.write` |
| `DELETE` | `/v1/account-groups/{id}` | Delete an empty group | `accounts.write` |
| `POST` | `/v1/account-groups/{id}/close` | Close a group | `accounts.write` |
| `POST` | `/v1/account-groups/{id}/activate` | Reactivate a closed group | `accounts.write` |
| `GET` | `/v1/account-groups/{id}/balances` | Balances, one line per currency | `accounts.read` |
| `GET` | `/v1/account-groups/status-counts` | Count groups by status | `accounts.read` |

---

## `POST /v1/account-groups`

Creates a group. Generated route; validation is `CreateAccountGroupCommandValidator`.

- **Auth:** `accounts.write`
- **Idempotency:** not idempotent — a retry creates a second group unless `code` repeats, which is refused
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `code` | string | ✓ | 3–5 characters, must not already exist | body |
  | `name` | string | ✓ | non-empty, ≤ 200 characters | body |
  | `description` | string | — | ≤ 1000 characters | body |
  | `type` | enum | ✓ | one of `Customer`, `Merchant`, `Internal`, `Suspense`, `Settlement` | body |
  | `ownerId` | string | ✓ | non-empty, ≤ 100 characters | body |
  | `metadata` | map\<string,string\> | — | round-trips verbatim | body |

- **Response:** `201 Created` — `AccountGroupDto`, `status: "Active"`
- **Errors:** `422 DUPLICATE_GROUP_CODE` · `400` malformed body
- **Enforcement:** FluentValidation, enforced

```bash
curl -X POST "https://accounts.example.com/v1/account-groups" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"ACME1","name":"Acme Pte Ltd","type":"Customer","ownerId":"cust-00042"}'
```

## `GET /v1/account-groups`

Lists groups. Generated `MapGetList<AccountGroup, Guid, AccountGroupDto>()` route — full contract:
[Generic List Endpoint](../../generic-list-endpoint.md); this service's queryable fields and defaults:
[the README](../../../README.md#listing-groups-and-accounts).

- **Auth:** `accounts.read`
- **Response:** `200 OK` — `PagedResponse<AccountGroupDto>`
- **Errors:** `400` unknown filter/order field

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/account-groups?filter=Type:Equal:Customer"
```

## `GET /v1/account-groups/{id}`

- **Auth:** `accounts.read`
- **Response:** `200 OK` — `AccountGroupDto`
- **Errors:** `400` malformed id · `404` unknown id

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/account-groups/{id}"
```

## `PUT /v1/account-groups/{id}`

Updates `name`, `description` and/or `metadata`. A member left out (or `null`) is unchanged; `code`,
`type` and `ownerId` have no update path at all.

- **Auth:** `accounts.write`
- **Request:** `name` (string, ≤ 200, when supplied), `description` (string, ≤ 1000, optional),
  `metadata` (map, optional) — at least one of the three must be supplied
- **Response:** `200 OK` — `AccountGroupDto`
- **Errors:** `400` no member supplied, or malformed id · `404` unknown id
- **Enforcement:** FluentValidation, enforced

```bash
curl -X PUT "https://accounts.example.com/v1/account-groups/{id}" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"description":"Acme Pte Ltd — renamed"}'
```

## `DELETE /v1/account-groups/{id}`

The service's only delete route. Generated route; validation is `DeleteAccountGroupRequestValidator`.

- **Auth:** `accounts.write`
- **Response:** `204 No Content`
- **Errors:** `422 GROUP_NOT_EMPTY` — the group still holds any account, closed and zero-balance
  included · `400` malformed id · `404` unknown id
- **Enforcement:** FluentValidation, enforced

```bash
curl -X DELETE "https://accounts.example.com/v1/account-groups/{id}" -H "Authorization: Bearer $TOKEN"
```

## `POST /v1/account-groups/{id}/close`

Closes a group — the one hand-written handler in this slice (`CloseAccountGroupHandler`, replacing
the generated one on the same route) because its refusal reads the group's *accounts*, a different
aggregate.

- **Auth:** `accounts.write`
- **Request:** none
- **Response:** `200 OK` — `AccountGroupDto`, `status: "Closed"`
- **Errors:** `422 GROUP_HOLDS_BALANCE` — any account it holds carries a non-zero balance or held
  amount · `400` malformed id · `404` unknown id

```bash
curl -X POST "https://accounts.example.com/v1/account-groups/{id}/close" -H "Authorization: Bearer $TOKEN"
```

## `POST /v1/account-groups/{id}/activate`

Reactivates a closed group. No request body, no guard on the entity method.

- **Auth:** `accounts.write`
- **Response:** `200 OK` — `AccountGroupDto`, `status: "Active"`
- **Errors:** `400` malformed id · `404` unknown id

```bash
curl -X POST "https://accounts.example.com/v1/account-groups/{id}/activate" -H "Authorization: Bearer $TOKEN"
```

## `GET /v1/account-groups/{id}/balances`

Hand-written aggregation, not a stored field: groups the group's own accounts by `CurrencyCode` and
sums `Balance` and `HeldAmount` per currency (`GetAccountGroupBalancesQueryHandler`).

- **Auth:** `accounts.read`
- **Response:** `200 OK` — `[{ currency, balance, available, held }]`. `available` mirrors `balance` —
  this service has no hold mechanism yet, so the two are always equal. A group holding no account
  answers `200` with an empty list — and so does an unknown id, since this read sums accounts *by*
  group id and never looks the group up itself
- **Errors:** `400` malformed id

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/account-groups/{id}/balances"
```

## `GET /v1/account-groups/status-counts`

Generic `MapGetStatusCounts<AccountGroup>` helper — counts groups by `Status`, including a value no
group currently holds (backfilled with zero).

- **Auth:** `accounts.read`
- **Request:** `from`/`to` (RFC 3339, optional) — narrows by the group's `CreatedOn`
- **Response:** `200 OK` — `[{ status, count }]`
- **Errors:** `400` a narrowing other than the date window

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/account-groups/status-counts"
```

## Common Error Response Format

Every non-2xx response is `application/problem+json` — `title`, `status`, `type`, `traceId`, and an
`errors[]` list of `{ message, code, field }`. Full shape and the complete refusal-code table:
[the README](../../../README.md#refusals-and-error-codes).
