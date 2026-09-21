# Architecture

## Shape

```
Browser  ──same-origin──>  Next.js (ui/)  ──Bearer JWT──>  DKNet.Accounts.Api
           /api/*             route handlers                  /v1/*
                              + RSC pages
```

The browser never sees an API access token. It talks only to the Next.js origin.

## Auth (BFF)

- **Auth.js (NextAuth v5)** with an OIDC provider pointed at the same issuer the API
  validates against (`Authentication:Schemes:Bearer:MetadataAddress`).
- The access token is kept in the encrypted, httpOnly session cookie. It is read
  server-side only, inside route handlers and server components.
- Requested scopes: `accounts.read accounts.write postings.read postings.write postings.reverse`.
  The issued token may carry fewer — the session exposes the **granted** scopes, and the
  UI gates on those, never on what was requested.
- Refresh on expiry happens inside the route handler. A failed refresh returns `401` to
  the island, which surfaces a re-authenticate prompt rather than a broken table.

### Scope gating, in two places

Both are required. Neither alone is enough.

1. **Server** — each route handler asserts the granted scope before proxying. A missing
   scope is a `403` from the BFF, so a hand-crafted `fetch` gains nothing.
2. **Client** — `useScopes()` hides or disables actions the session cannot perform, with
   the reason stated. A disabled Reverse button reads *"requires postings.reverse"*, not
   a silent absence.

> Hiding an action the user cannot perform is a courtesy. Refusing it server-side is the
> control. Do not confuse the two.

## Data layer

**RSC shell + TanStack Query islands.**

- **Server components** render the page frame, breadcrumbs, and the first paint of
  detail screens (account header, group identity). They call the API directly with the
  session token — no self-fetch through `/api/*`.
- **Client islands** — every table, filter bar, form and dialog — use TanStack Query
  against `/api/*`. They own loading, error and refetch behaviour.
- The server passes its already-fetched data to the island as `initialData`, so the
  first render is not a spinner and the island still owns subsequent refetches.

### Query keys

Keys mirror the API's own shape so invalidation is mechanical:

```ts
['accounts', 'list', listQuery]          // list routes
['accounts', id]                         // one account
['accounts', id, 'balance']
['accounts', id, 'statement', { from, to, pageIndex, pageSize }]
['groups', id, 'balances']
['postings', id]
```

### Invalidation after a write

| Action | Invalidate |
|---|---|
| Record posting | `['accounts', accountId]`, `['accounts', accountId, 'balance']`, `['accounts', accountId, 'statement']`, `['groups', groupId, 'balances']` |
| Record batch | the same, for **every** account touched by the batch |
| Reverse posting | the above for the posting's account, plus `['postings', id]` and `['postings', reversalId]` |
| Open / patch account | `['accounts']`, `['groups', groupId, 'balances']` |
| Group lifecycle | `['groups']`, `['groups', id]` |

A posting changes a balance, and a balance rolls up into a group. Forgetting the group
invalidation is the bug that makes a group's balance page look stale and correct at the
same time.

## URL is the state

Every list and statement screen keeps filter, sort, page and date bounds in the query
string via `nuqs`. Three reasons, in order of how much they matter to an ops console:

1. A screen someone is looking at can be pasted into a ticket.
2. Back and forward behave.
3. Server and client read the same source of truth, so `initialData` matches.

## Project layout (`ui/`)

```
ui/
  app/
    (ledger)/
      page.tsx                       Overview
      groups/…                       list · [id]
      accounts/…                     list · [id] · [id]/statement
      postings/…                     [id] · new
    (admin)/
      currencies/page.tsx
    api/
      [...path]/route.ts             the BFF proxy
      auth/[...nextauth]/route.ts
  components/
    ui/                              shadcn primitives, unmodified
    ledger/                          the domain components of 03-components.md
  lib/
    api/                             typed client, list-query builder, errors
    money.ts                         formatting and precision
    scopes.ts
```

### The BFF proxy

One catch-all handler rather than a file per route. It:

1. Resolves the session and refuses with `403` when the granted scopes do not cover the
   method and path.
2. Forwards the request to the API with the bearer token, passing through
   `Idempotency-Key` unchanged.
3. Returns the API's status and body **untouched** — the `errors[]` array reaches the
   client exactly as the API wrote it, because the client's error handling is built on
   `errors[].code`.

A per-route handler for each of the 28 routes would be 28 files restating the same three
steps. The scope table lives in one place instead:

```ts
const SCOPES = {
  'GET    /v1/accounts/*/statement': 'postings.read',
  'POST   /v1/postings/*/reverse':   'postings.reverse',
  'POST   /v1/postings*':            'postings.write',
  'GET    /v1/postings*':            'postings.read',
  'GET    /v1/*':                    'accounts.read',
  '*      /v1/*':                    'accounts.write',
} // first match wins — order matters
```

## Generated types

`DKNet.Accounts.Api` publishes OpenAPI. Generate the request and response types into
`ui/lib/api/schema.d.ts` with `openapi-typescript` as a committed build step, so a DTO
change in the service breaks the UI build rather than production.

The enums in particular must come from the service, never be retyped by hand:
`AccountStatus`, `AccountClassification`, `AccountGroupType`, `AccountGroupStatus`,
`PostingDirection`, `PostingCategory`, `PostingStatus`.

## Testing

| Layer | Tool | Covers |
|---|---|---|
| Pure logic | Vitest | Amount precision against `Currency.DecimalPlaces`, floor computation, the list-query builder, signed-amount formatting |
| Components | Vitest + Testing Library | The money components render three values; a disabled action states its reason |
| Flows | Playwright + MSW | One test per code in `LedgerErrors` — the refusal renders the right message in the right place. Plus: record → statement updates, reverse → both rows link, double-submit sends one key |
| Accessibility | axe in the Playwright run | Every screen, both themes |

The refusal tests are the ones that matter. Every code in the vocabulary is a real
answer the API gives, and each has a place in the UI where it must appear.
