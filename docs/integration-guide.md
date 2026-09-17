# Integration Guide

The end-to-end walkthrough for a system integrating against `DKNet.Accounts.Api` for the first time:
authenticate, create a group, open an account, post a credit and a debit, read the balance back and see
it equal the signed sum of what you posted, then page a statement to its empty last page.

Every field, invariant and error code is catalogued in the [readme](../README.md); this page is the
running order.

> **What is live at this commit.** All ten steps run today, and every payload below was captured from a
> running instance against PostgreSQL rather than transcribed from the contract. The one thing that is
> deliberately absent is reserving funds: held funds are deferred, so `heldAmount` is always `0` and
> `availableBalance` always equals `balance`.

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
  "type": "customer",
  "status": "active",
  "ownerId": "acme-holdings",
  "metadata": { "region": "SG" }
}
```

Two things to note, and they hold for every response on this page:

- **Enum values come back camelCase** (`"customer"`, `"active"`) even though requests are written
  PascalCase. Compare case-insensitively.
- **Null fields are omitted.** This group was created without a `description`, so there is no
  `description` key at all rather than a `null` one.

Re-using a `code` is refused:

```json
{
  "title": "Error",
  "status": 422,
  "type": "UnprocessableEntity",
  "traceId": "00-8b1f2c4d5e6a7b8c9d0e1f2a3b4c5d6e-1a2b3c4d5e6f7a8b-01",
  "errors": [
    {
      "message": "A group with code 'CUST-000123' already exists.",
      "code": "DUPLICATE_GROUP_CODE",
      "field": null
    }
  ]
}
```

Every business-rule refusal has this shape: `422`, `application/problem+json`, and an `errors` list
whose entry carries a stable `code`. Branch on `errors[].code` — never on `message`, which is written
for a human and is free to change. There is no top-level `code` member to read, and the body carries no
free-text member beside the list. The examples below shorten the body to `status` and `errors`; the
other three members are always there.

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
  "currency": "SGD",
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

A fresh account is `active`, at `0`, with `streamPosition` `0` and no `lastPostedOn`.

Opening an account permitted to go negative without saying how far is refused, so no account is ever
left without a determinate floor:

```json
{
  "status": 422,
  "errors": [
    {
      "message": "An account permitted to go negative must state its overdraft limit.",
      "code": "OVERDRAFT_LIMIT_REQUIRED"
    }
  ]
}
```

An unsupported currency is refused the same way, with `UNSUPPORTED_CURRENCY`.

## 4. Read the balance before you post

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/v1/accounts/e87b6feb-4741-4af3-83f3-1bb4d4771331/balance"
```

```json
{ "currency": "SGD", "balance": 0.0, "availableBalance": 0.0, "heldAmount": 0.0 }
```

`heldAmount` is always `0` and `availableBalance` always equals `balance` — held funds are deferred in
this delivery, so both fields give a defined answer rather than an undefined one. Do not build a
reservation flow on them yet.

## 5. Post a credit

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
  "id": "e3d0d40f-9ba7-4d38-8609-f44bc310f29b",
  "postingNumber": "PST0000000001",
  "accountId": "cf91d0e9-f876-40a4-8f52-febfc2204718",
  "streamPosition": 1,
  "direction": "credit",
  "amount": 100.0,
  "currency": "SGD",
  "signedAmount": 100.0,
  "balanceAfter": 100.0,
  "effectiveDate": "2026-09-14",
  "recordedAt": "2026-09-14T08:30:29.5482505+00:00",
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

`signedAmount` is the movement resolved against the account's ledger side, and it is what sums to
`balance` — so **its sign follows the classification, not the direction.** This account is a
`Liability`, where a credit raises the balance, so the credit is `+100.0`. On an `Asset` or `Expense`
account the same credit would be `-100.0`. Sum an account's `signedAmount`s and you get its `balance`;
that is the invariant you can check from outside.

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
  "errors": [
    {
      "message": "The idempotency key 'pay-77af' was already used with different content.",
      "code": "IDEMPOTENCY_KEY_CONFLICT"
    }
  ]
}
```

The key is scoped to `(your client_id, key)`. Another system using `pay-77af` for its own posting does
not collide with you.

## 6. Post a debit, and meet the floor

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

The response carries `"streamPosition": 2`, `"signedAmount": -30.0` and `"balanceAfter": 70.0` — a
debit is negative against this `Liability` account, and `100.0 - 30.0` is the `70.0` you can read back.

This account is not permitted to go negative and has a `minimumBalance` of `0`, so its floor is `0`. A
debit of `90.00` would take it past that floor, and it is refused outright — **nothing is recorded and
the balance does not move**:

```json
{
  "status": 422,
  "errors": [
    {
      "message": "The debit would take the account past its floor.",
      "code": "INSUFFICIENT_FUNDS"
    }
  ]
}
```

Where more than one control is set, **the most restrictive one binds**: an account holding `100.00` with
a `minimumBalance` of `50.00` and an `overdraftLimit` of `20.00` has a floor of `50.00`, not `-20.00`, so
a debit of `60.00` is refused.

Other refusals you will meet here, each with `nothing recorded`:

| `code` | When |
|---|---|
| `INVALID_POSTING_AMOUNT` | `0.00` or a negative amount — direction, not sign, carries the meaning — **or** an amount finer than the currency, e.g. `10.555` against a 2-decimal currency. One code, both conditions, and one message — the response does not tell you which of the two you hit |
| `CURRENCY_MISMATCH` | Posting USD against an SGD account |
| `ACCOUNT_FROZEN` | The account is frozen — it accepts nothing in either direction |
| `ACCOUNT_DORMANT_DEBIT_REFUSED` | The account is dormant — it accepts credits only |
| `ACCOUNT_CLOSED` | The account is closed |
| `LOCK_TIMEOUT` | The service waited 10 seconds for this account's posting lock and gave up. Nothing recorded — retry with the same `Idempotency-Key` |

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

```http
HTTP/1.1 201 Created
```

```json
[
  {
    "id": "3d6d83d6-4639-41ea-b3c3-01f030d1d80c",
    "postingNumber": "PST0000000010",
    "accountId": "d7dae46c-3854-4a88-b385-5c62fa841703",
    "streamPosition": 2,
    "direction": "debit",
    "amount": 400.0,
    "currency": "SGD",
    "signedAmount": -400.0,
    "balanceAfter": 100.0,
    "effectiveDate": "2026-09-14",
    "recordedAt": "2026-09-14T08:31:15.587368+00:00",
    "category": "transfer",
    "status": "posted",
    "transactionGroupId": "2717a380-3af8-4cc0-bd70-75b46b98912b",
    "callingSystem": "PayHub",
    "idempotencyKey": "transfer-9931"
  },
  {
    "id": "6ae71f87-5b02-42b1-bd31-c1991f33457f",
    "postingNumber": "PST0000000011",
    "accountId": "6eb93805-ea1c-4ca7-9314-381c5a7c54a6",
    "streamPosition": 1,
    "direction": "credit",
    "amount": 400.0,
    "currency": "SGD",
    "signedAmount": 400.0,
    "balanceAfter": 400.0,
    "effectiveDate": "2026-09-14",
    "recordedAt": "2026-09-14T08:31:15.587368+00:00",
    "category": "transfer",
    "status": "posted",
    "transactionGroupId": "2717a380-3af8-4cc0-bd70-75b46b98912b",
    "callingSystem": "PayHub"
  }
]
```

Both legs share one `transactionGroupId` and one `recordedAt`. Leave the id unset, as above, and the
service generates one; set it yourself to tie a batch to a transaction you already have an id for.

Two things about the key on this route. It is recorded on the batch's **first leg only** — notice the
second leg has no `idempotencyKey` of its own — and repeating the whole request under `transfer-9931`
returns the same two postings with `200`, recording nothing new.

**Do not share a key between `POST /v1/postings` and `POST /v1/postings/batch.`** The two routes
compute their content signatures differently, so a key first used on one and then sent to the other is
refused `409 IDEMPOTENCY_KEY_CONFLICT` even when the movement is identical. Keep a separate key space
per route.

## 7. Correct a mistake — reverse, never delete

The ledger has no delete route. A posting recorded in error is corrected by reversing it, which writes
an *opposing* posting and marks the original `reversed`.

```bash
curl -X POST "$BASE/v1/postings/3f0b1e4c-6a2d-4f1a-9c33-5d7b21e9a401/reverse" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "reason": "Invoice INV-9001 was settled twice" }'
```

```http
HTTP/1.1 200 OK
```

```json
{
  "id": "309fb14c-a5ee-4f36-a393-5130a2593d43",
  "postingNumber": "PST0000000008",
  "accountId": "038e91e4-31de-40a3-96d3-1c6e220c558f",
  "streamPosition": 3,
  "direction": "debit",
  "amount": 100.0,
  "currency": "SGD",
  "signedAmount": -100.0,
  "balanceAfter": 5.0,
  "effectiveDate": "2026-09-14",
  "recordedAt": "2026-09-14T08:31:04.3631317+00:00",
  "category": "reversal",
  "status": "posted",
  "reversesPostingId": "a3b6f961-c181-40c9-97d0-8d9b84b9530f",
  "callingSystem": "PayHub",
  "description": "Reversal of PST0000000006"
}
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

A statement is a date-bounded, paged read of one account's postings **in stream order** — the order they
were recorded, never effective-date order.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/v1/accounts/e87b6feb-4741-4af3-83f3-1bb4d4771331/statement?from=2026-06-01&to=2026-06-30&pageIndex=1&pageSize=10"
```

The statement comes back in an envelope — the postings are under `items`. `GET /v1/accounts` and
`GET /v1/account-groups` answer with the same envelope, but page with `pageNumber` rather than the
statement's `pageIndex`; see the README's
[API contract](../README.md#the-api-contract) for their query surface.

```json
{
  "items": [
    {
      "id": "a3b6f961-c181-40c9-97d0-8d9b84b9530f",
      "postingNumber": "PST0000000006",
      "accountId": "038e91e4-31de-40a3-96d3-1c6e220c558f",
      "streamPosition": 1,
      "direction": "credit",
      "amount": 100.0,
      "currency": "SGD",
      "signedAmount": 100.0,
      "balanceAfter": 100.0,
      "effectiveDate": "2026-06-30",
      "recordedAt": "2026-09-14T08:31:04.113925+00:00",
      "category": "payment",
      "status": "posted",
      "callingSystem": "PayHub",
      "description": "Invoice INV-9001 settled"
    },
    {
      "id": "339755f9-1641-454b-b9e6-a5f7024c6cb4",
      "postingNumber": "PST0000000007",
      "accountId": "038e91e4-31de-40a3-96d3-1c6e220c558f",
      "streamPosition": 2,
      "direction": "credit",
      "amount": 5.0,
      "currency": "SGD",
      "signedAmount": 5.0,
      "balanceAfter": 105.0,
      "effectiveDate": "2026-06-15",
      "recordedAt": "2026-09-14T08:31:04.121027+00:00",
      "category": "payment",
      "status": "posted",
      "callingSystem": "PayHub"
    }
  ],
  "pageCount": 1,
  "pageNumber": 1,
  "pageSize": 10,
  "totalItemCount": 2,
  "hasNextPage": false,
  "hasPreviousPage": false
}
```

Those two are the backdating case below: the 30 June posting was recorded first, so it comes back
first even though the 15 June one is earlier by `effectiveDate`.

Page through by incrementing `pageIndex` (1-based) until `items` comes back empty. The pages
**partition** the stream: every posting in the range appears exactly once, none twice, none skipped.
Reading past the end is not an error — the last page is simply empty, with `200`:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/v1/accounts/038e91e4-31de-40a3-96d3-1c6e220c558f/statement?from=2026-06-01&to=2026-06-30&pageIndex=2&pageSize=10"
```

```http
HTTP/1.1 200 OK
```

```json
{
  "items": [],
  "pageCount": 1,
  "pageNumber": 2,
  "pageSize": 10,
  "totalItemCount": 2,
  "hasNextPage": false,
  "hasPreviousPage": true
}
```

An empty `items` is your loop's terminating condition. `hasNextPage` works too, and is the cheaper
check when you want to stop one request earlier — but do not compute a page count yourself and stop on
it.

**Backdating and stream order interact.** If you record a posting dated 30 June and then record one
backdated to 15 June, a statement covering all of June returns the 30 June posting **first**, because
that is where it sits in the stream. `balanceAfter` only makes sense in that order. Sort client-side by
`effectiveDate` if your reader needs a date-ordered view.

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

This read sums accounts *by* group id and never looks the group up, so a group holding no account
answers `200` with `[]` — and so does an identifier that matches no group at all. An empty list is not
evidence that the group exists; read the group itself if you need that.

## 10. Closing up

An account closes with a `PATCH`, and reopens with the same call carrying `{"status":"Active"}`:

```bash
curl -X PATCH "$BASE/v1/accounts/e87b6feb-4741-4af3-83f3-1bb4d4771331" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "status": "Closed" }'
```

A group closes and reopens on its own routes, each of which takes no request body — the group is named
entirely by the address:

```bash
curl -X POST "$BASE/v1/account-groups/b85813c0-3053-4d35-a0ef-3f2863f83fa9/close" \
  -H "Authorization: Bearer $TOKEN"

curl -X POST "$BASE/v1/account-groups/b85813c0-3053-4d35-a0ef-3f2863f83fa9/activate" \
  -H "Authorization: Bearer $TOKEN"
```

A `PATCH` to `/v1/account-groups/{id}` is no longer offered at all — that address answers `405`.

An account cannot be closed while it holds any balance or any held amount (`ACCOUNT_HOLDS_BALANCE`); a
group cannot be closed while any account it holds carries a balance (`GROUP_HOLDS_BALANCE`). Empty them
first — by posting, not by deleting.

A group that holds no account can also be deleted outright, which is the one delete route in the
service:

```bash
curl -X DELETE "$BASE/v1/account-groups/b85813c0-3053-4d35-a0ef-3f2863f83fa9" \
  -H "Authorization: Bearer $TOKEN"
```

It answers `204` with no body. While the group still holds any account the delete is refused
`422 GROUP_NOT_EMPTY` — closed, zero-balance accounts included, because those accounts still exist.

**Calling this from a browser?** The shipped `Cors:AllowedMethods` default is
`GET, POST, PUT, PATCH` — it does not include `DELETE`, so a browser front-end that deletes a group has
to add `DELETE` to that list. See [`configuration-reference.md`](configuration-reference.md#cors).

## Where to go next

- [Readme](../README.md) — every field of every record type, every invariant, the full route and error
  tables, and what the service deliberately does not own.
- `GET /openapi/v1.json` on a running instance — the machine-readable contract.
- [docs/index.md](index.md) — the solution-template reference docs, for when you are changing this
  service rather than calling it.
