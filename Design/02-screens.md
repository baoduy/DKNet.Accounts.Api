# Screens

## Navigation

A fixed left sidebar, two sections, collapsing to a `sheet` below `md`.

```
DKNet Accounts
────────────────
LEDGER
  Overview            /
  Account groups      /groups
  Accounts            /accounts
  Record posting      /postings/new
ADMINISTRATION
  Currencies          /currencies
────────────────
  ⌘K  Search
  <user>  ▾
```

There is no "Transactions" entry. The API exposes no route that lists postings across
accounts, so a link promising one would lead to a screen that cannot be built. Postings
are reached through an account's statement, through search by posting number, or by
following a permalink.

Breadcrumbs on every detail screen: `Groups / ACME / ACME-000123 / Statement`.

---

## Overview — `/`

Search-first. The console's most common task is "find this account", so the search input
is the page, not a widget on it.

**Layout**

1. A large search input, autofocused, with the same behaviour as `⌘K`.
2. Status-count tiles — accounts by status, groups by status.
3. Recently viewed (last 10, from `localStorage`, ids resolved on render).

**Search behaviour.** Detects what was typed and routes accordingly:

| Input looks like | Action |
|---|---|
| A UUID | Try account, then group, then posting; go to the first that resolves |
| `<GROUPCODE>-<digits>` | `GET /v1/accounts?filter=AccountNumber:Equal:<value>` → the account |
| 2+ characters, anything else | `GET /v1/accounts?search=<value>` and `GET /v1/account-groups?search=<value>`, results grouped by type in the `command` palette |

Below 2 characters the search does nothing and says so — the API's `search` has a
two-character minimum and would answer `400`.

**Tiles.** Blocked on an API addition; see the gap note in [README.md](README.md).
Until the route exists they render as skeletons with a one-line explanation. Do not
substitute a client-side count over a full listing: with `pageSize` capped at 1000 it
would be silently wrong above 1000 records.

---

## Account groups — `/groups`

A `LedgerTable` over `GET /v1/account-groups`.

| Column | Field | Sortable | Notes |
|---|---|---|---|
| Code | `code` | yes | Monospace |
| Name | `name` | yes | Links to the group |
| Type | `type` | yes | Badge — Customer · Merchant · Internal · Suspense · Settlement |
| Status | `status` | yes | Badge — Active · Closed |
| Owner | `ownerId` | yes | |
| Description | `description` | yes | Truncated, full text on hover |

Filters: type, status, free-text search. **Create group** opens a dialog:
code, name, description, type, owner, metadata. `DUPLICATE_GROUP_CODE` renders on the
code field.

---

## Group detail — `/groups/[id]`

Three stacked regions.

**1 · Identity.** Code (monospace, copyable), name, type badge, status badge, owner,
description, metadata as key/value pairs. Inline rename and description edits — each is
its own `PUT`, so each saves independently.

**2 · Balances.** `GET /v1/account-groups/{id}/balances`. One row per currency:

```
Balances
  SGD    1,204,882.50
  USD      318,004.00
  ─────────────────────────────────────────────
  Balances are reported per currency and are never
  combined into a single total.
```

That last line is part of the design, not commentary. The space under a column of
numbers is where a reader expects a total; leaving it blank invites someone to add
one later. State why it is empty.

An empty response reads *"No accounts in this group yet."* — but note that this read
sums accounts **by** group id and never looks the group up, so an id matching no group
also answers `200` with an empty list rather than `404`. The group identity region is
therefore the screen's not-found authority: when `GET /v1/account-groups/{id}` returns
`404`, render the not-found state for the whole page and never reach this call.

**3 · Accounts in the group.** The accounts table scoped by
`filter=GroupId:Equal:{id}`, with an **Open account** action.

**Lifecycle actions.** Close and Activate, each an `alert-dialog`.
Close is refused with `GROUP_HOLDS_BALANCE` while any account in the group carries a
balance, and with `GROUP_NOT_EMPTY` on delete while it still holds accounts. Both
refusals render in the dialog with the offending accounts listed, so the next step is
visible without leaving the screen.

---

## Accounts — `/accounts`

A `LedgerTable` over `GET /v1/accounts`.

| Column | Field | Sortable | Notes |
|---|---|---|---|
| Account no. | `accountNumber` | yes | Monospace, links to the account |
| Name | `name` | yes | |
| Group | `groupId` | yes | Resolved to the group code |
| Currency | `currencyCode` | **yes, as `CurrencyCode`** | The response reads `currency`; the query takes the other spelling |
| Classification | `classification` | yes | Asset · Liability · Equity · Income · Expense |
| Status | `status` | yes | Badge — Active · Frozen · Dormant · Closed |
| Balance | `balance` | yes | Money, right-aligned |
| Available | `availableBalance` | **NO** | Computed — sorting it is a `400` |
| Opened | `openedOn` | **NO** | Computed — sorting it is a `400` |

The two `NO` rows are the reason `LedgerTable` takes a per-column `sortable` flag rather
than assuming every column sorts. A table that renders a sort control on `availableBalance`
hands the user a button whose only effect is an error.

The default order is newest-opened-first, which is what the list route already returns
and what an `openedOn` sort would have given.

---

## Account detail — `/accounts/[id]`

**Header.** Account number (monospace, copyable), name, group link, currency,
classification, status badge, opened date.

**Balances — three tiles, never one.**

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ BALANCE      │ │ AVAILABLE    │ │ HELD         │
│  12,400.00   │ │  12,400.00   │ │      0.00    │
│ SGD          │ │ SGD          │ │ SGD          │
└──────────────┘ └──────────────┘ └──────────────┘
  Floor: −5,000.00 SGD  (overdraft limit 5,000.00)
```

`Balance` and `Available` are equal today — `AvailableBalance => Balance` on the entity,
with held funds deferred. They are still shown separately, because the day holds are
implemented the two diverge, and a UI that showed one number would be wrong that day
with no code change to blame.

**The floor line** is computed from `PermittedToGoNegative`, `OverdraftLimit` and
`MinimumBalance`, mirroring `AccountFloorPolicy`:

| `PermittedToGoNegative` | `OverdraftLimit` | `MinimumBalance` | Floor shown |
|---|---|---|---|
| false | — | null | `0.00` |
| false | — | set | the minimum balance |
| true | set | — | `−overdraftLimit` |
| true | **null** | — | invalid — the API refuses this state with `OVERDRAFT_LIMIT_REQUIRED` |

**Controls** (`PATCH /v1/accounts/{id}`) — status, overdraft limit, minimum balance.
Status changes are an `alert-dialog`. Closing is refused with `ACCOUNT_HOLDS_BALANCE`
while balance or held amount is non-zero; the dialog states the current balance so the
user sees what must be moved first.

**Actions.** Record posting · View statement · Rename · Edit metadata.
Record is **disabled with a stated reason** when the account's status forbids it:

| Status | Credit | Debit | Reason shown |
|---|---|---|---|
| Active | yes | yes | — |
| Dormant | yes | **no** | "This account is dormant — debits are refused" |
| Frozen | **no** | **no** | "This account is frozen" |
| Closed | **no** | **no** | "This account is closed" |

This mirrors `AccountPostingPolicy.StatusGate`. Letting the user fill a form and
discover the refusal on submit is worse, and no safer — the server check is unchanged.

---

## Statement — `/accounts/[id]/statement`

The screen the console exists for. `GET /v1/accounts/{id}/statement`,
`pageIndex` / `pageSize` (default 20), optional `from` / `to` as `DateOnly`.

**Controls.** A date-range picker with presets (7 / 30 / 90 days, this month, all),
a page-size selector, and the account's balance tiles pinned above so the reader never
loses the current position while paging.

| Column | Field | Notes |
|---|---|---|
| Effective | `effectiveDate` | Date only |
| Recorded | `recordedAt` | Timestamp, secondary weight |
| Posting no. | `postingNumber` | Monospace, links to the posting |
| Description | `description` | With a category badge |
| Direction | `direction` | Credit · Debit |
| Amount | `signedAmount` | Signed money, right-aligned, tabular |
| Balance after | `balanceAfter` | Money, right-aligned, tabular |
| # | `streamPosition` | Monospace, secondary — the ledger's own ordering |

**Rows are in stream order** and the table says so, because a reader who sorts a ledger
by amount has destroyed the only thing `balanceAfter` means. Column sorting is **off**
on this table entirely. That is deliberate and should not be "fixed" later.

**Reversed rows.** The amount is struck through, a `Reversed` badge sits beside the
posting number, and a link points to the reversal. The reversal row itself carries a
`Reversal of …` link back. Both directions, always — a correction that can only be read
forwards is half a record.

**Row actions.** View posting · Reverse (when `status === 'Posted'` and the session has
`postings.reverse`).

**Empty states** are three different messages, because they mean three different things:

- No postings at all → *"No postings recorded on this account."*
- No postings in the chosen range → *"No postings between 1 Jan and 31 Jan."* + Clear dates
- Paged past the end → *"No more postings."* + Back to first page

---

## Posting detail — `/postings/[id]`

A permalink, because a posting id is what gets pasted into a ticket.

Posting number, account (linked), direction, amount, currency, balance after, effective
date, recorded at, category, status, calling system, stream position, idempotency key,
transaction group, counterparty account and reference, external reference, description,
metadata.

**Reversal lineage** as an explicit block: *"Reversed by `POST-000456` on 3 Feb"* or
*"Reverses `POST-000123`"*, each linked. When `transactionGroupId` is set, a link to the
other legs of the batch — resolved through the statements of the accounts involved,
since no route lists a transaction group directly.

**Reverse** is here too, same guard as on the statement.

---

## Record posting — `/postings/new`

Two tabs: **Single** and **Batch**.

### Single

| Field | Source | Notes |
|---|---|---|
| Account | Search-select | Pre-filled when arriving from an account |
| Currency | From the account | **Read-only.** Mismatch is `CURRENCY_MISMATCH`; there is no reason to let it be typed |
| Direction | Credit / Debit | Disabled per the account's status gate above |
| Amount | Number | Validated against the currency's `decimalPlaces` before submit |
| Effective date | Date, defaults today | **Future dates blocked in the picker** — `EFFECTIVE_DATE_IN_FUTURE` |
| Category | Select | Transfer · Payment · Fee · Interest · Adjustment · Refund · Reversal · OpeningBalance |
| Description | Text | |
| Counterparty account / reference | Optional | |
| External reference | Optional | |
| Metadata | Key/value editor | |

**The idempotency key is minted when the form mounts**, shown in a collapsed
"Idempotency" row, and sent in the `Idempotency-Key` header. It is regenerated only when
the form is reset after a success.

This is the one non-obvious rule on the screen. Minting the key on submit instead means
a double-click sends two distinct keys and records two postings — which is exactly the
failure idempotency exists to prevent. Minting on mount means the second click replays
the first request and the API returns `200` rather than `201`.

**The key survives a failed submit.** After a refusal the user corrects a field and
resubmits with the same key, and that is correct in both cases it can be in:

- The refusal was genuine — nothing was recorded, so no key is stored and the corrected
  request goes through normally.
- The first request actually succeeded and the client only *saw* a failure — the key is
  stored, the corrected body no longer matches it, and the API answers `409`
  `IDEMPOTENCY_KEY_CONFLICT`. That is the right answer: it says the movement already
  happened. Minting a fresh key on retry would instead have recorded it twice.

**Confirm step.** A dialog restating the movement in words before it is sent:

> Debit **12,400.00 SGD** from **ACME-000123 · Operating Account**,
> effective **21 Sep 2026**, category **Transfer**.

**Outcome.** `201` → success toast with a link to the new posting, form reset, new key.
`200` (replay) → *"This request was already recorded"* with a link to the original
posting and **no** duplicate created. Both are successes; they are not the same success,
and telling them apart is the point.

### Batch

A row editor — account, direction, amount, currency, category, description — with a
running per-currency total and a per-account net, and a shared `transactionGroupId`
(generated when left blank).

**All-or-nothing.** The dialog says so before submit, and a refusal names the offending
row and leaves the whole batch unrecorded. The confirm step lists every leg.

---

## Reverse a posting

An `alert-dialog`, reachable from the statement row, the posting detail, and nowhere
else. It restates the original movement, states the effect — *"a new opposing posting
will be recorded; the original is marked Reversed"* — and requires an explicit confirm.

It is worth being plain about what reversal is: it writes a **new** posting and flips the
original's status. It does not erase anything. The dialog says that, because a user who
believes they are deleting a row will use it differently from one who knows they are
appending a correction.

Refusals: `POSTING_ALREADY_REVERSED` (the dialog closes and the row refreshes — someone
else got there first), `ACCOUNT_CLOSED`, `ACCOUNT_FROZEN`.

---

## Currencies — `/currencies`

Reference data, edited rarely, consulted often.

| Column | Field | Notes |
|---|---|---|
| Code | `code` | Monospace |
| Name | `name` | |
| Decimals | `decimalPlaces` | Drives amount validation across the app |
| Active | `isActive` | Badge |

Create (code, name, decimal places — `DUPLICATE_CURRENCY_CODE` on the code field),
rename, activate, deactivate. Deactivate carries a warning: an inactive currency is
refused on both **open account** and **record posting** with `UNSUPPORTED_CURRENCY`.
That consequence is not obvious from the word "deactivate", so the dialog spells it out.

---

## Cross-cutting states

**Loading.** Skeletons matching the final layout, never spinners on tables. A table that
collapses to a spinner and back makes the page jump.

**Errors.** Business refusals (`422`, `409`) render inline — see
[04-api-map.md](04-api-map.md). Transport and `5xx` errors render as a retryable
card with the `traceId` shown and copyable, because the API's unhandled-error response
asks the caller to quote it.

**Permissions.** An action the session lacks the scope for is rendered disabled with the
required scope named, not hidden. A missing button is indistinguishable from a bug.

**Responsive.** Below `md`, tables become stacked cards; the statement keeps amount and
balance-after on one line so the ledger still reads as a ledger.
