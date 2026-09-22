# API map, query traps and the refusal vocabulary

## Route map

28 routes. Every one either has a screen or is deliberately unused.

### Account groups — `/v1/account-groups`

| Method | Route | Scope | Screen |
|---|---|---|---|
| POST | `/` | `accounts.write` | Create dialog on `/groups` |
| GET | `/` | `accounts.read` | `/groups` |
| GET | `/{id}` | `accounts.read` | `/groups/[id]` |
| PUT | `/{id}` | `accounts.write` | Inline rename, description edit, metadata editor (partial: send any subset) |
| POST | `/{id}/close` | `accounts.write` | Close dialog |
| POST | `/{id}/activate` | `accounts.write` | Activate dialog |
| DELETE | `/{id}` | `accounts.write` | Delete dialog |
| GET | `/{id}/balances` | `accounts.read` | Group balances region — **an unknown id answers `200` with an empty list, not `404`**; gate on the group read instead |

### Accounts — `/v1/accounts`

| Method | Route | Scope | Screen |
|---|---|---|---|
| POST | `/` | `accounts.write` | Open account dialog |
| GET | `/` | `accounts.read` | `/accounts` |
| GET | `/{id}` | `accounts.read` | `/accounts/[id]` |
| PUT | `/{id}` | `accounts.write` | Inline rename / metadata editor (partial: send either or both) |
| PATCH | `/{id}` | `accounts.write` | Status / overdraft / minimum balance |
| GET | `/{id}/balance` | `accounts.read` | Balance tiles |
| GET | `/{id}/statement` | **`postings.read`** | `/accounts/[id]/statement` |

There is **no** `DELETE /v1/accounts/{id}`. Closing is the `PATCH`.

### Postings — `/v1/postings`

| Method | Route | Scope | Screen |
|---|---|---|---|
| POST | `/` | `postings.write` | `/postings/new` — Single |
| POST | `/batch` | `postings.write` | `/postings/new` — Batch |
| GET | `/{id}` | `postings.read` | `/postings/[id]` |
| POST | `/{id}/reverse` | **`postings.reverse`** | Reverse dialog — body `reason` and header `Idempotency-Key` both required |

**No list route.** This is the constraint that shapes the whole information
architecture — see D5 in [README.md](README.md).

### Currencies — `/v1/currencies`

| Method | Route | Scope | Screen |
|---|---|---|---|
| POST | `/` | `accounts.write` | Create dialog |
| GET | `/` | `accounts.read` | `/currencies` |
| GET | `/{id}` | `accounts.read` | Row detail |
| PUT | `/{id}` | `accounts.write` | Rename |
| POST | `/{id}/activate` | `accounts.write` | Activate |
| POST | `/{id}/deactivate` | `accounts.write` | Deactivate |

---

## The list-query contract

Shared by `GET /v1/account-groups`, `GET /v1/accounts` and `GET /v1/currencies`.

| Parameter | Default | Notes |
|---|---|---|
| `filter` | none | `Field:Operation:Value`, repeatable, AND-ed, **max 20** |
| `search` | none | OR across text fields, **min 2 characters** |
| `orderBy` / `desc` | newest first | One field; `Id` desc is always appended as tie-breaker |
| `pageNumber` | 1 | 1-based, clamped not refused |
| `pageSize` | 1000 | Clamped to 1..1000 |
| `fromDate` / `toDate` | unbounded | Inclusive ISO-8601 bounds on last activity |

Operations: `Equal` · `NotEqual` · `GreaterThan` · `GreaterThanOrEqual` · `LessThan` ·
`LessThanOrEqual` · `Contains` · `NotContains` · `StartsWith` · `EndsWith` · `In` ·
`NotIn` · `IsNull` · `IsNotNull`.

`In` / `NotIn` take a comma-separated list. `IsNull` / `IsNotNull` use the two-segment
form with no value: `filter=ClosedOn:IsNull`.

Field names normalise to PascalCase — `group_id`, `group-id` and `GroupId` all resolve.
**An unknown field is a `400`, never a silently dropped condition.**

### Queryable fields

**Account groups:** `code` · `name` · `description` · `type` · `status` · `ownerId` · `metadata`

**Accounts:** `accountNumber` · `groupId` · `name` · `classification` · `status` ·
`balance` · `heldAmount` · `overdraftLimit` · `minimumBalance` · `permittedToGoNegative` ·
`streamPosition` · `lastPostedOn` · `externalReference` · `metadata` · `closedOn` ·
`currencyCode`

### The three traps

| Trap | Consequence | UI rule |
|---|---|---|
| `currency` in the body, `CurrencyCode` in the query | `filter=Currency:Equal:SGD` → `400` | The currency column sets `queryAs: 'CurrencyCode'` |
| `availableBalance` is computed | `filter` or `orderBy` → `400` | Column is `sortable: false` and unfilterable. Filter on `balance` — the two are equal while holds are deferred |
| `openedOn` is computed | `filter` or `orderBy` → `400` | Column is `sortable: false`. The default order is already newest-opened-first |

### Statement paging is different

`GET /v1/accounts/{id}/statement` takes `pageIndex` / `pageSize` (1-based, default 20)
and `from` / `to` as `DateOnly` — not `pageNumber`, not ISO timestamps. This is why
`<StatementTable>` is a separate component from `<LedgerTable>`.

### The activity window

A bare listing is currently **unbounded in time**:
`ListQueryOptions.DefaultActivityWindowMonths = 0` in
`ApiEndpoints/DKNet.Accounts.AppServices/AppSetup.cs` overrides the package's three-month
default. `fromDate=0001-01-01T00:00:00Z` is the documented way to ask for all history if
that ever changes. `fromDate` later than `toDate` is a `400`.

---

## The refusal vocabulary

Business refusals arrive as `422` (or `409` for the one conflict) with
`errors[].code`, `errors[].field`, `errors[].message`. The UI maps **on `code`** and
never on message text.

| Code | Status | Where it surfaces | Message |
|---|---|---|---|
| `OVERDRAFT_LIMIT_REQUIRED` | 422 | Open account · PATCH account, on the overdraft field | An account permitted to go negative must state its overdraft limit |
| `ACCOUNT_HOLDS_BALANCE` | 422 | Close-account dialog | This account still holds a balance and cannot be closed. Current balance: *n* |
| `GROUP_HOLDS_BALANCE` | 422 | Close-group dialog | Accounts in this group still carry balances |
| `GROUP_NOT_EMPTY` | 422 | Delete-group dialog | This group still holds accounts. Close or move them first |
| `DUPLICATE_GROUP_CODE` | 422 | Create group, on the code field | A group with this code already exists |
| `DUPLICATE_CURRENCY_CODE` | 422 | Create currency, on the code field | This currency code already exists |
| `UNSUPPORTED_CURRENCY` | 422 | Open account · Record posting, on the currency field | *X* is not a supported or currently active currency |
| `INVALID_POSTING_AMOUNT` | 422 | Record, on the amount field | The amount must be positive and match the currency's precision |
| `CURRENCY_MISMATCH` | 422 | Record — should be unreachable | The posting's currency does not match the account's |
| `EFFECTIVE_DATE_IN_FUTURE` | 422 | Record, on the date field — should be unreachable | The effective date cannot be in the future |
| `INSUFFICIENT_FUNDS` | 422 | Record, on the amount field | This would take the account below its floor of *n* |
| `ACCOUNT_CLOSED` | 422 | Record · Reverse | This account is closed |
| `ACCOUNT_FROZEN` | 422 | Record · Reverse | This account is frozen |
| `ACCOUNT_DORMANT_DEBIT_REFUSED` | 422 | Record, debit only | This account is dormant — debits are refused |
| `POSTING_ALREADY_REVERSED` | 422 | Reverse dialog | This posting has already been reversed *(close the dialog and refresh the row)* |
| `IDEMPOTENCY_KEY_CONFLICT` | **409** | Its own dialog · Reverse dialog | This idempotency key was already used for a different request *(show the key)*. From the reverse dialog it means the dialog reused its key after the reason was edited — a bug, not a user error: regenerate the key when the reason changes |
| `LOCK_TIMEOUT` | 422 | Record · Reverse | The account is busy. **Retry** *(the only refusal with a retry affordance)* |

**Should be unreachable** means the UI prevents it — the currency is read-only, future
dates are blocked in the picker, the status gate disables the control. They are still
mapped, because "unreachable" is a claim about today's UI and the server is the authority.

### Two things that are not refusals

- **`200` instead of `201` on record** means an idempotent replay: the request was
  already recorded and nothing new was written. Show it as a distinct success with a
  link to the original posting — not as a new posting, and not as an error.
- **`5xx`** renders a retryable card with the `traceId` shown and copyable. The API's
  own unhandled-error message asks the caller to quote it.

### Other statuses

| Status | Meaning | UI |
|---|---|---|
| 400 | Malformed request — usually a bad `filter` or `orderBy` field | A bug in the UI. Log it and show a generic message; the user cannot act on it |
| 401 | Token expired or refresh failed | Re-authenticate prompt, current screen preserved |
| 403 | Missing scope | "You do not have permission to do this" and the required scope |
| 404 | Not found | Empty state with a link back to the list |
| 429 | Rate limited | Back off and retry with a countdown |
