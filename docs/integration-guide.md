# Integration Guide

The end-to-end walkthrough for a system integrating against `DKNet.Accounts.Api` for the first time:
authenticate, create a group, open an account, post a credit and a debit, read the balance back and see
it equal the signed sum of what you posted, then page a statement to its empty last page.

Every field, invariant and error code is catalogued in the [readme](../README.md); this page is the
running order.

> **What is live at this commit.** Steps 1–4 and 9 run today — the payloads below were captured from a
> running instance. Steps 5–8 (`POST /v1/postings`, `POST /v1/postings/batch`, `GET /v1/postings/{id}`,
> `POST /v1/postings/{id}/reverse`, `GET /v1/accounts/{id}/statement`) answer
> `500 NotImplementedException` until `[D1242-3]` lands. Their request and response shapes below are the
> settled contract those routes are registered with, not a guess — but they are shapes, not captures,
> and they are marked as such.

## Before you start

You need:

- A base URL. Routes live under `/v1`; this guide writes `$BASE` for the host, e.g.
  `http://localhost:5000`.
- A JWT bearer credential your instance's issuer minted for **your system**, carrying:
  - `client_id` — your system's identity. This is what gets stamped on every posting you record and
    what scopes your idempotency keys. You cannot override it from a request body.
  - `scp` (or `scope`) — a space-separated list of the scopes you need. This guide uses all five:
    `accounts.read accounts.write postings.read postings.write postings.reverse`.

Every request below carries `Authorization: Bearer $TOKEN` and, where it has a body,
`Content-Type: application/json`.

Without a credential you get `401` with an empty body:

```bash
curl -i "$BASE/v1/currencies"
```

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
```

With a credential that lacks the scope for the operation class, you get `403`, also with an empty body —
holding `accounts.read` does not let you record a posting.

## 1. Discover the currencies you may use

An account's currency has to be one the service knows, and the number of decimal places it reports is
enforced on every posting amount you send.

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/v1/currencies"
```

```json
[
  { "code": "SGD", "decimalPlaces": 2 },
  { "code": "USD", "decimalPlaces": 2 },
  { "code": "JPY", "decimalPlaces": 0 }
]
```

JPY is denominated to zero places — `¥100.50` is not a posting amount.

## 2. Create an account group

A group is the bucket accounts sit in. `code` is yours and must be unique across the service; `ownerId`
is your own pointer at whoever owns the group.

```bash
curl -X POST "$BASE/v1/account-groups" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
        "code": "CUST-000123",
        "name": "Acme Pte Ltd",
        "description": "Acme customer bucket",
        "type": "Customer",
        "ownerId": "acme-holdings",
        "metadata": { "region": "SG" }
      }'
```

```http
HTTP/1.1 201 Created
```

```json
{
  "id": "b85813c0-3053-4d35-a0ef-3f2863f83fa9",
  "code": "CUST-000123",
  "name": "Acme Pte Ltd",
  "description": "Acme customer bucket",
  "type": "customer",
  "status": "active",
  "ownerId": "acme-holdings",
  "metadata": { "region": "SG" }
}
```

Two things to note, and they hold for every response on this page:

- **Enum values come back camelCase** (`"customer"`, `"active"`) even though requests are written
  PascalCase. Compare case-insensitively.
- **Null fields are omitted.** This group has no parent, so there is no `parentId` key at all rather
  than a `null` one.

Re-using a `code` is refused:

```json
{
  "type": "UnprocessableEntity",
  "title": "Error",
  "status": 422,
  "detail": "A group with code 'CUST-000123' already exists.",
  "instance": "POST /v1/account-groups",
  "errors": ["A group with code 'CUST-000123' already exists."],
  "code": "DUPLICATE_GROUP_CODE",
  "traceId": "0HNOI4SE9O6LP:00000001"
}
```

Every business-rule refusal has this shape: `422`, `application/problem+json`, and a stable `code` you
can branch on. Branch on `code`, never on `detail`.

## 3. Open an account

An account lives in exactly one group, in exactly one currency, with a classification that fixes which
side of the ledger a credit increases. `permittedToGoNegative` is required; if you set it to `true` you
must also state an `overdraftLimit`.

```bash
curl -X POST "$BASE/v1/accounts" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
        "groupId": "b85813c0-3053-4d35-a0ef-3f2863f83fa9",
        "name": "Acme Pte Ltd Operating",
        "currency": "SGD",
        "classification": "Liability",
        "permittedToGoNegative": false,
        "minimumBalance": 0,
        "externalReference": "acme-op-1",
        "metadata": { "team": "treasury" }
      }'
```

```http
HTTP/1.1 201 Created
```

```json
{
  "id": "e87b6feb-4741-4af3-83f3-1bb4d4771331",
  "accountNumber": "ACC0000000001",
  "groupId": "b85813c0-3053-4d35-a0ef-3f2863f83fa9",
  "name": "Acme Pte Ltd Operating",
  "classification": "liability",
  "status": "active",
  "balance": 0,
  "availableBalance": 0,
  "heldAmount": 0,
  "minimumBalance": 0,
  "permittedToGoNegative": false,
  "streamPosition": 0,
  "externalReference": "acme-op-1",
  "metadata": { "team": "treasury" },
  "openedOn": "2026-09-14T06:13:16.1063454+00:00"
}
```

A fresh account is `active`, at `0`, with `streamPosition` `0` and no `lastPostedOn`. The account's
`currency` is part of the contract but is missing from this response at this commit — see
[known deviations](../README.md).

Opening an account permitted to go negative without saying how far is refused, so no account is ever
left without a determinate floor:

```json
{
  "status": 422,
  "detail": "An account permitted to go negative must state its overdraft limit.",
  "code": "OVERDRAFT_LIMIT_REQUIRED"
}
```

An unsupported currency is refused the same way, with `UNSUPPORTED_CURRENCY`.

## 4. Read the balance before you post

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/v1/accounts/e87b6feb-4741-4af3-83f3-1bb4d4771331/balance"
```

```json
{ "balance": 0.0, "availableBalance": 0.0, "heldAmount": 0.0 }
```

`heldAmount` is always `0` and `availableBalance` always equals `balance` — held funds are deferred in
this delivery, so both fields give a defined answer rather than an undefined one. Do not build a
reservation flow on them yet.

## 5. Post a credit

> Not live at this commit — the route is registered, its handler answers `500 NotImplementedException`.

A posting is one credit or debit against one account. The amount is always **strictly positive**; the
`direction` says which way the money moved. Send your own idempotency key in the `Idempotency-Key`
header on every posting write.

```bash
curl -X POST "$BASE/v1/postings" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: pay-77af" \
  -d '{
        "accountId": "e87b6feb-4741-4af3-83f3-1bb4d4771331",
        "direction": "Credit",
        "amount": 100.00,
        "currency": "SGD",
        "category": "Payment",
        "description": "Invoice INV-9001 settled",
        "externalReference": "INV-9001"
      }'
```

```http
HTTP/1.1 201 Created
```

```json
{
  "id": "3f0b1e4c-6a2d-4f1a-9c33-5d7b21e9a401",
  "postingNumber": "PST0000000001",
  "accountId": "e87b6feb-4741-4af3-83f3-1bb4d4771331",
  "streamPosition": 1,
  "direction": "credit",
  "amount": 100.00,
  "currency": "SGD",
  "signedAmount": 100.00,
  "balanceAfter": 100.00,
  "effectiveDate": "2026-09-14",
  "recordedAt": "2026-09-14T06:13:16.1063454+00:00",
  "category": "payment",
  "status": "posted",
  "callingSystem": "PayHub",
  "idempotencyKey": "pay-77af",
  "externalReference": "INV-9001",
  "description": "Invoice INV-9001 settled"
}
```

`callingSystem` came from your credential's `client_id`. If you had put `"recordedBy": "LedgerSync"` in
the body it would have been ignored, not rejected — the posting is still attributed to you.

`effectiveDate` was unset, so it is the recording date. You may **backdate** it to record something that
already happened outside the service; a **future** date is refused with `EFFECTIVE_DATE_IN_FUTURE`.

### What a retry returns

Repeat the same request, unchanged, under the same key and you get the **original** posting back — same
`id`, same `streamPosition` — with `200 OK` instead of `201 Created`, and nothing new is recorded. The
balance is still `100.00`.

```bash
# byte-for-byte the same request as above
curl -X POST "$BASE/v1/postings" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: pay-77af" \
  -d '{ … identical body … }'
```

```http
HTTP/1.1 200 OK
```

Re-use the same key with *different* content and it is refused rather than guessed at:

```json
{
  "status": 409,
  "detail": "The idempotency key 'pay-77af' was already used with different content.",
  "code": "IDEMPOTENCY_KEY_CONFLICT"
}
```

The key is scoped to `(your client_id, key)`. Another system using `pay-77af` for its own posting does
not collide with you.

## 6. Post a debit, and meet the floor

> Not live at this commit.

```bash
curl -X POST "$BASE/v1/postings" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: pay-77b0" \
  -d '{
        "accountId": "e87b6feb-4741-4af3-83f3-1bb4d4771331",
        "direction": "Debit",
        "amount": 30.00,
        "currency": "SGD",
        "category": "Transfer",
        "description": "Settlement to Acme supplier"
      }'
```

The response carries `"streamPosition": 2`, `"signedAmount": -30.00` and `"balanceAfter": 70.00`.

This account is not permitted to go negative and has a `minimumBalance` of `0`, so its floor is `0`. A
debit of `90.00` would take it past that floor, and it is refused outright — **nothing is recorded and
the balance does not move**:

```json
{
  "status": 422,
  "detail": "The debit would take the account past its floor.",
  "code": "FLOOR_BREACHED"
}
```

Where more than one control is set, **the most restrictive one binds**: an account holding `100.00` with
a `minimumBalance` of `50.00` and an `overdraftLimit` of `20.00` has a floor of `50.00`, not `-20.00`, so
a debit of `60.00` is refused.

Other refusals you will meet here, each with `nothing recorded`:

| `code` | When |
|---|---|
| `AMOUNT_NOT_POSITIVE` | `0.00` or a negative amount — direction, not sign, carries the meaning |
| `AMOUNT_PRECISION_EXCEEDED` | `10.555` against a 2-decimal currency |
| `CURRENCY_MISMATCH` | Posting USD against an SGD account |
| `ACCOUNT_FROZEN` | The account is frozen — it accepts nothing in either direction |
| `ACCOUNT_DORMANT_DEBIT_REFUSED` | The account is dormant — it accepts credits only |
| `ACCOUNT_CLOSED` | The account is closed |

### Two movements as one transaction

`POST /v1/postings/batch` records several movements all-or-nothing. If any one of them would be
refused, **none** of them is recorded and no balance moves.

```bash
curl -X POST "$BASE/v1/postings/batch" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: transfer-9931" \
  -d '{
        "movements": [
          { "accountId": "<from>", "direction": "Debit",  "amount": 400.00, "currency": "SGD", "category": "Transfer" },
          { "accountId": "<to>",   "direction": "Credit", "amount": 400.00, "currency": "SGD", "category": "Transfer" }
        ]
      }'
```

Both legs come back sharing one `transactionGroupId`. Leave it unset, as above, and the service
generates one; set it yourself to tie a batch to a transaction you already have an id for.

## 7. Correct a mistake — reverse, never delete

> Not live at this commit.

There is no delete route in this service. A posting recorded in error is corrected by reversing it,
which writes an *opposing* posting and marks the original `reversed`.

```bash
curl -X POST "$BASE/v1/postings/3f0b1e4c-6a2d-4f1a-9c33-5d7b21e9a401/reverse" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "reason": "Invoice INV-9001 was settled twice" }'
```

The reversal is a debit of the identical `100.00`, `"category": "reversal"`, with `reversesPostingId`
pointing at the original; the original's `status` becomes `reversed` and its `reversedByPostingId`
names the reversal. Both stay readable forever. This needs `postings.reverse` — `postings.write` alone
is not enough.

Three rules worth knowing before you rely on it:

- **A posting can be reversed at most once.** A second attempt is `POSTING_ALREADY_REVERSED`.
- **A reversal is dated the day it is written**, not the date the original took effect.
- **A reversal is never refused for want of funds, but is never exempt from account status.** It is the
  one movement exempt from the floor — if the account has since been spent down to `20.00`, reversing
  that `100.00` credit lands anyway and leaves the balance at `-80.00`, which is a real debt you can
  read. But the account's status still binds, and a reversal is refused wherever that status does not
  accept a movement in the reversal's **own direction**:
  - a **closed** or **frozen** account accepts nothing, so `PATCH /v1/accounts/{id}` it back to
    `{"status":"Active"}` first, then reverse;
  - a **dormant** account accepts credits only, so it takes a *crediting* reversal and refuses a
    *debiting* one until you make it active.

Nothing becomes permanently uncorrectable by this — returning an account to a status that accepts
postings is an explicit, attributable act available to you at any time.

## 8. Read the statement, page by page

> Not live at this commit.

A statement is a date-bounded, paged read of one account's postings **in stream order** — the order they
were recorded, never effective-date order.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/v1/accounts/e87b6feb-4741-4af3-83f3-1bb4d4771331/statement?from=2026-06-01&to=2026-06-30&pageIndex=1&pageSize=10"
```

Page through by incrementing `pageIndex` until a page comes back empty. The pages **partition** the
stream: every posting in the range appears exactly once, none twice, none skipped. Reading past the end
is not an error — the last page is simply empty, with `200`:

```bash
# after 25 postings have been read across pages 1, 2 and 3
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/v1/accounts/e87b6feb-4741-4af3-83f3-1bb4d4771331/statement?from=2026-06-01&to=2026-06-30&pageIndex=4&pageSize=10"
```

```http
HTTP/1.1 200 OK
```

```json
[]
```

That empty page is your loop's terminating condition — do not compute a page count and stop on it.

**Backdating and stream order interact.** If you record a posting dated 30 June and then record one
backdated to 15 June, a statement covering all of June returns the 30 June posting **first**, because
that is where it sits in the stream. `balanceAfter` only makes sense in that order. Sort client-side by
`effectiveDate` if your reader needs a date-ordered view.

At this commit this route additionally requires `AccountId` as a query parameter; see
[known deviations](../README.md).

## 9. Prove the balance

The point of the whole exercise: read the balance back and check it against what you posted.

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/v1/accounts/e87b6feb-4741-4af3-83f3-1bb4d4771331/balance"
```

After credits of `100.00`, `250.00` and `5.50` and debits of `30.00` and `12.25` against an account
opened at `0.00`, the balance is `313.25` — the signed sum of the postings, with nothing else in it.
That equality is an invariant, not a coincidence: if it ever fails to hold, that is a defect in this
service, not in your arithmetic.

You can also read a whole group's totals, one line per currency and never combined:

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/v1/account-groups/b85813c0-3053-4d35-a0ef-3f2863f83fa9/balances"
```

```json
[
  { "currency": "SGD", "balance": 0.0 }
]
```

A group holding `100.00 SGD` and `80.00 USD` returns two lines. There is no combined total across
currencies, and there never will be — the service has no exchange rate and is not going to invent one.

## 10. Closing up

Closing is a `PATCH`, not a `DELETE`:

```bash
curl -X PATCH "$BASE/v1/accounts/e87b6feb-4741-4af3-83f3-1bb4d4771331" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "status": "Closed" }'
```

An account cannot be closed while it holds any balance or any held amount (`ACCOUNT_HAS_BALANCE`); a
group cannot be closed while any account it holds carries a balance (`GROUP_HAS_BALANCE`). Empty them
first — by posting, not by deleting. Reopening is the same call with `{"status":"Active"}`.

## Where to go next

- [Readme](../README.md) — every field of every record type, every invariant, the full route and error
  tables, and what the service deliberately does not own.
- `GET /openapi/v1.json` on a running instance — the machine-readable contract.
- [docs/index.md](index.md) — the solution-template reference docs, for when you are changing this
  service rather than calling it.
