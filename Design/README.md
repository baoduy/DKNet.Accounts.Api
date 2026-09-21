# DKNet Accounts Console — UI Design

Design specification for the operations and administration console over
`DKNet.Accounts.Api`. The application itself will be built later under `ui/`.

**Stack:** Next.js (App Router) · TypeScript · shadcn/ui · Tailwind · TanStack Query
**Pattern:** BFF — the browser never holds an API access token.

| Document | Contents |
|---|---|
| [01-architecture.md](01-architecture.md) | App architecture, BFF and auth, data layer, project layout |
| [02-screens.md](02-screens.md) | Every screen: layout, states, actions, empty and error cases |
| [03-components.md](03-components.md) | Component inventory, design tokens, money and number rules |
| [04-api-map.md](04-api-map.md) | Route map, query-surface traps, the refusal vocabulary |

---

## What this console is for

Two areas of equal weight, one navigation tree:

- **Ledger** — account groups, accounts, balances, statements, postings.
  Read-heavy investigation work, with guarded write actions.
- **Administration** — currencies and reference data.

## Decisions on record

| # | Decision | Why |
|---|---|---|
| D1 | Account groups live under **Ledger**, not Administration | Groups carry per-currency balances and own the accounts, so they are the natural drill-down root. Splitting one resource across two navigation areas makes people hunt for it. |
| D2 | **BFF**: Next.js route handlers hold the token | The API is JWT + scope protected. The token stays in an httpOnly session server-side; the browser calls only same-origin `/api/*`. No CORS surface, no token in JS, scope checks enforced server-side. |
| D3 | **RSC shell + TanStack Query islands** | Server components render the page frame and first paint; interactive tables and forms hydrate and fetch through the BFF. Chosen over server-actions-everywhere for table responsiveness on the statement and list screens. |
| D4 | Write actions are enabled, **with guardrails** | Record posting, record batch and reverse are all available, each behind an explicit confirm step, scope gate and idempotency discipline. See [02-screens.md](02-screens.md). |
| D5 | No global transactions list | The API exposes no `GET /v1/postings`. Postings are reachable only via an account statement or by id. The IA reflects this rather than fighting it. |
| D6 | Money is never rendered as a single number | `Balance`, `AvailableBalance` and `HeldAmount` are three distinct values, and the account's floor is computed from three more fields. See [03-components.md](03-components.md). |
| D7 | Group balances are never summed across currencies | The API deliberately returns one line per currency. The UI states this where a total would otherwise sit. |

## Constraints taken from the API

These are not preferences. Violating them produces a `400`, a `422`, or a wrong number.

1. **No `GET /v1/postings`.** Only `POST /`, `POST /batch`, `GET /{id}`, `POST /{id}/reverse`.
2. **`availableBalance` and `openedOn` are not queryable.** Both are computed on the
   entity, not stored. `filter` or `orderBy` on either is a `400`. Table columns for
   them must have sorting disabled.
3. **Currency is queried as `CurrencyCode`, not `Currency`.** The response body reads
   `currency`; the query surface takes `CurrencyCode`.
4. **Two paging contracts.** List routes use `pageNumber` / `pageSize` (1-based,
   default size 1000). The statement route uses `pageIndex` / `pageSize` (1-based,
   default size 20).
5. **`Idempotency-Key` is read from the request header** and overwrites any body value.
6. **Accounts have no delete route.** Closing is a `PATCH` with `{"status":"Closed"}`,
   and is refused while the account holds a balance.
7. **A bare listing is unbounded in time** — `ListQueryOptions.DefaultActivityWindowMonths`
   is `0` in `ApiEndpoints/DKNet.Accounts.AppServices/AppSetup.cs`, overriding the
   package default of three months. If that value ever changes, every list screen
   silently starts hiding older records with no signal in the UI.

## Known gap: the Overview tiles

The Overview screen specifies status-count tiles (accounts by status, groups by
status). The codebase contains `MapGetStatusCounts<TEntity>` in
`ApiEndpoints/DKNet.Accounts.Api/Configs/Endpoints/StatusCountsEndpointMapperExtensions.cs`,
but **it is not mapped to any route**. The tiles need one API addition per resource:

```csharp
group.MapGetStatusCounts<Account>("status", new StatusPropertyInfo(nameof(Account.Status), typeof(AccountStatus)));
```

Until that route exists, the Overview renders the tiles in a skeleton state with a
"not yet available" note rather than computing counts client-side over a full listing.

## Mockups

`Design/mockups/` holds a static mockup of every screen, generated from the design
system's tokens. Open `mockups/index.html`, or any screen file directly — each is
self-contained, so a file:// double-click renders correctly with no server and no
network. Every page has a theme toggle; both themes are built in.

| File | Screen |
|---|---|
| `01-overview.html` | Overview |
| `02-groups.html` | Account groups |
| `03-group-detail.html` | Group detail |
| `04-accounts.html` | Accounts |
| `05-account-detail.html` | Account detail — shown on a Dormant account, so the gated action is visible |
| `06-statement.html` | Statement |
| `07-posting.html` | Posting detail |
| `08-record-posting.html` | Record posting |
| `09-currencies.html` | Currencies |

`mockups/tokens.css` is the compiled token set for the `ui/` app to import. The same CSS
is inlined into each mockup so the files stand alone; regenerate the two together rather
than editing either by hand. Both are generated from the design system artifact, which is
the source of truth for token values.

These show **what** each screen renders. The prose — states, empty cases, refusal
placement — is in [02-screens.md](02-screens.md) and is not repeated in the markup.
