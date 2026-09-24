# DKNet Accounts Console

A Next.js operations console that signs an operator into `DKNet.Accounts.Api` with Microsoft
Entra ID, and reads and writes the ledger through its own pass-through endpoint. The accounts
screen, the account detail screen and the Records screen are the ledger screens that ship
(`ui/app/page.tsx`'s own frame still renders no data).

## ✨ Why use it?

- **One sign-in for ledger operations staff.** The console authenticates an operator against your
  Entra ID tenant instead of every screen needing its own credential handling.
- **The access token never reaches the browser.** Sign-in runs authorization code + PKCE
  server-side; only a signed `sessionId` cookie crosses to the browser, and the token itself is
  cached encrypted in Redis (`ui/lib/token-store.ts`, `ui/lib/session.ts`).
- **Built on shadcn/ui, on the design system's tokens.** `AppShell`, `Sidebar`, `PageHeader`,
  `UserMenu` (`ui/components/shell/`) and every base control in `ui/components/ui/` are shadcn/ui
  components restyled onto the design system's tokens (`Design/README.md`), rendering both light
  and dark themes from the same variables. One exception: `UserMenu`'s disclosure is a native
  `<details>`/`<summary>` restyled on shadcn, not Radix's `DropdownMenu` — Radix replays no click
  that lands before hydration (`ui/components/shell/UserMenu.tsx:30-35`). Adherence to the
  token/spacing rules is enforced by a lint step (`pnpm run lint`, `ui/.oxlintrc.json`,
  `ui/oxlint-plugins/design-system.js`) that CI's build job runs ahead of `typecheck`
  (`.github/workflows/build.yml:81`).

## 🚀 Quick Start

```bash
cp .env.sample .env
# fill CONSOLE_ENTRA_TENANT_ID and CONSOLE_ENTRA_CLIENT_ID — see "Entra app registration" below
docker compose up
```

This starts `postgres`, `redis`, the API and the console together
(`docker-compose.yml`). Once the console's environment keys are on `.env.sample`, its service
publishes on `${CONSOLE_PORT:-3000}` — check `.env.sample` on this branch for the current port
mapping.

> **The accounts screen, the account detail screen and the Records screen ship.** Signing in
> reaches the accounts list at `/accounts`; opening an account reaches its detail at
> `/accounts/<account-number>`; `/records` lists postings across every account. The root frame at
> `/` still shows no data. See *Features* below.

## 🧩 Features

### Sign-in and session

`GET /signin` starts an authorization-code + PKCE flow against your Entra tenant; `GET
/signin/callback` completes it and opens a session; `POST /signout` ends one. A callback whose
`state` has no server-side record is refused, and each `state` is consumed exactly once
(`ui/lib/oidc.ts`). The session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, signed with
`CONSOLE_SESSION_SECRET`, and carries only the session id — never the token
(`ui/lib/session.ts`).

### Sign-in not configured

`CONSOLE_ENTRA_TENANT_ID` and `CONSOLE_ENTRA_CLIENT_ID` blank means no directory is wired up
yet. The console still starts, serves a not-configured page instead of offering sign-in, and
redirects nobody (`ui/app/not-configured/page.tsx`, `ui/lib/config.ts`).

### Identity menu

Once signed in, the top bar states the identity provider, the tenant, and the scopes the token
carries, and names any scope the console knows about that the token doesn't carry
(`ui/components/shell/UserMenu.tsx`, `Design/components/shell/UserMenu.d.ts`). The console's
known-scope set is the ledger contract's five: `accounts.read`, `accounts.write`,
`postings.read`, `postings.write`, `postings.reverse`
(`ApiEndpoints/DKNet.Accounts.Api/Configs/Auth/SampleAuthorizationRequirement.cs:12-20`) —
`accounts.read`/`postings.read` gate viewing accounts/postings, `postings.reverse` gates
reversing a posting, and `accounts.write`/`postings.write` gate every ledger write
(`ui/lib/scopes.ts`).

### Accounts screen

`/accounts` lists accounts: search (2 characters minimum — a shorter term is never sent), a
currency filter, sortable columns, and paging. The whole view — filter, sort and page — round-trips
through the page address, so a copied link reproduces the same view. Each row's account number
links to `/accounts/<account-number>` — the account detail screen, below. A row's status is one of
the account's four: `Active`, `Frozen`, `Dormant`, `Closed`.

Opening an account (`accounts.write`) is the one write this screen offers: group, currency and
accounting classification (`Asset`, `Liability`, `Equity`, `Income`, `Expense`) are chosen from
lists the service itself supplies, never typed; the account number is assigned by the service.
Floor settings — permitted to go negative, overdraft limit, smallest permitted balance — are
always answered, never left at a silent default. Permitting negative with no overdraft limit is
refused as `OVERDRAFT_LIMIT_REQUIRED`; an unsupported currency is refused as
`UNSUPPORTED_CURRENCY`. The one close/reopen control lives on the detail screen, not here.

### Account detail screen

`/accounts/<account-number>` shows one account: its balance, available balance and held amount,
and the floor the service states for it (permitted to go negative, overdraft limit, smallest
permitted balance). An address matching no account renders a not-found message alone — never
another account's data.

Its status is one of the same four values, next to a quick close/reopen control: closing is
disabled with the held figure and `ACCOUNT_HOLDS_BALANCE` while the account still holds a balance
or a held amount; reopening has no such condition. A separate status setting (in the account's
edit form, alongside its name and floor) can set any of the four directly, not only close/reopen.

Below that, the postings list opens on the last 30 days, editable through two date inputs (from,
to) plus 7/30/90-day presets. An empty or unparseable period, one with the end before the start,
or one over 90 days is refused on screen with its own message and never sent to the service.
Narrows further by direction, category and status. Recording a posting (`postings.write`) is
against this account only: the account and its currency are locked, not choosable. Reversing a
posting (`postings.reverse`) needs a reason of at most 500 characters; without the permission the
reverse action stays visible and disabled, stating that it needs `postings.reverse`.

The record and reverse forms here are shared with the Records screen, below: recording asks for
confirmation — restating direction, amount, currency and account — before anything is sent, and
`Reverse` stays on screen but disabled, with its reason, on a posting that is already reversed
(`POSTING_ALREADY_REVERSED`) or on a posting that is itself a reversal (no code; the service has
none) (DRK-1713 §3, "Both screens").

### Records screen

`/records` lists postings across every account in a paged table, most recently recorded first,
opening on the last 30 days. Each row shows the posting number, the account number (linking to
that account's detail screen), the direction, the category, the amount with its currency, the
effective date and the status — no running balance column. The list narrows by period, direction,
category and status: the period is always set, its last day at most 90 days after its first, and
a wider period is refused on screen with no request sent. It also searches by posting number,
counterparty reference and description — no other field is promised, and a term under 2 characters
is never sent. Only the posting number, the amount and the effective date carry a sort control.
The period, narrowing, search, sort, page and the open posting all live in the page address, so a
copied link reopens the same view. The screen offers no export action (DRK-1713 §3, "The list").

Choosing a row opens that posting's details beside the list: a posting is never edited or deleted
— reversing records an opposing posting and marks this one reversed, and both stay on the account.
A reversed posting shows which posting reversed it and that reversal's reason; a reversal shows
which posting it reverses and its own reason (DRK-1713 §3, "One posting").

Recording chooses the account by searching accounts by number or name; once chosen, its currency
is shown and locked, and the amount is sent exactly as typed — the service checks its decimal
places, not the form. Reversing states a reason of at most 500 characters; a missing or
over-length reason is refused on screen and nothing is reversed. Both actions confirm before
anything is sent, and after a success the list shows the result before the operator acts again:
the new posting for a recording, or both the new opposing posting and the original marked reversed
for a reversal (DRK-1713 §3, "Recording" and "Reversing"). Recording a posting needs
`postings.write`; reversing needs the separate `postings.reverse`; an operator missing either sees
that action on screen, disabled, naming the permission it needs (DRK-1713 §3, "Refusals and
permissions").

### Ledger pass-through endpoint

`ui/app/api/ledger/[...route]/route.ts` proxies `GET`/`POST`/`PUT`/`PATCH`/`DELETE` under `/api/ledger/…`
to `DKNet.Accounts.Api`: it resolves the operator's session, decrypts her access token
server-side, forwards the caller's `Idempotency-Key`, and returns the ledger service's answer
unchanged. Every inbound request is checked against `isLedgerRouteAllowed`
(`ui/lib/api/routes.ts`) — the set of routes the generated OpenAPI contract declares — and refused
before any outbound call if the route isn't in it. This cycle widens that set with the account
operations the accounts screen needs: opening an account, listing accounts, reading one, updating
its name/metadata, and changing its status/floor controls. It also gains `GET /postings/{id}`,
which the Records screen uses to follow a reversal link to the other posting (DRK-1713 §3a). The
token never crosses back to the browser — the service still checks every permission itself, so a
control disabled on screen for a missing scope is convenience only, not the enforcement point.

### Typed access layer and contract drift check

`pnpm run generate:api-schema` (`ui/scripts/generate-api-schema.ts`) regenerates
`ui/lib/api/schema.d.ts` from `ui/contract/openapi.json` — nobody hand-writes a route's
TypeScript shape. `pnpm run verify:contract` (`ui/scripts/verify-contract.ts`) re-derives the
OpenAPI document from the live service and fails, naming the drifted route, when the committed
contract no longer matches it; CI runs it ahead of `typecheck` (`.github/workflows/build.yml:85`).

### Ledger data caching

`ui/lib/query/client.tsx` is the TanStack Query provider every ledger screen mounts under. Its
default is `staleTime: 0` with refetch on mount and on window focus, so a figure on screen is
never older than the console's own last write; a query needing the currency list's cheaper
lifetime overrides `staleTime` to `Infinity` per call.

### Ledger component kit

A set of presentational components render ledger data once a screen wires them to the access
layer above: `Money`, `Currency`, `StatusBadge`, `AccountNumber`/`PostingNumber`, `BalanceTiles`,
`FloorLine`, `CurrencyBalanceList`, `LedgerTable`, `StatementTable`
(`ui/components/ledger/`); `ConfirmMovement`, `DetailPanel`, `RefusalAlert`, `ScopeGate`
(`ui/components/feedback/`); and `DateRangeFilter`, `IdempotencyKeyField`, `MetadataEditor`
(`ui/components/forms/`). `ScopeGate` disables its child and states the missing scope when the
session lacks it — again convenience only, since the service still enforces the permission.

### Account groups

`/groups` lists, creates, edits, deletes, closes and reactivates account groups, and reads a
group's balances, forwarding to `DKNet.Accounts.Api`'s `/account-groups` routes
(`AccountGroupsV1Endpoint.cs`): `GET` to list (narrowed by status and owner, sorted by name,
paged) and to read one or its balances need `accounts.read`; `POST` to create, `PUT {id}` to edit
name/description/metadata, `DELETE {id}`, and `POST {id}/close`/`{id}/activate` all need
`accounts.write`.

An operator can meet three refusals here, each staying on screen disabled with its reason and
code shown beside it: creating with a code already in use answers `DUPLICATE_GROUP_CODE` on the
code field; deleting a group that still holds an account answers `GROUP_NOT_EMPTY`; closing a
group whose account still carries a balance answers `GROUP_HOLDS_BALANCE`. A group's balances are
listed one line per currency and never totalled — the panel states amounts in different
currencies are not added, and shows no combined figure. A group's code and owner are fixed once
the record exists; only its name, description and metadata can change after.

### Currencies

`/currencies` lists, registers, renames, activates and deactivates reference currencies,
forwarding to `/currencies` routes (`CurrenciesV1Endpoint.cs`): `GET` to list and to read one need
`accounts.read`; `POST` to register (the form shows a live worked example of an amount at the
entered decimal places before the currency is saved), `PUT {id}` to rename, and
`POST {id}/activate`/`{id}/deactivate` all need `accounts.write`.

Two refusals: registering a code already in use answers `DUPLICATE_CURRENCY_CODE` on the code
field; deactivating a currency an account still holds a balance in answers
`CURRENCY_HOLDS_BALANCE`, staying on screen disabled with its code shown beside it. A currency's
code and decimal places are fixed once the record exists; only its name can change after.

## ⚙️ Configuration reference

Every key below is validated at container start by `ui/instrumentation.ts`'s `register()` hook,
which calls `loadConfig()` in `ui/lib/config.ts` — the one startup hook the standalone
`server.js` this image ships actually runs (`next.config.ts`'s own function only runs for the
`next dev`/`next build`/`next start` CLIs, never for the built standalone server). Defaults below
are `.env.sample`'s shipped values.

| Key | Type | Shipped default | Effect |
|---|---|---|---|
| `CONSOLE_ENTRA_TENANT_ID` | string | blank | Entra tenant (directory) ID. Blank → not-configured mode. |
| `CONSOLE_ENTRA_CLIENT_ID` | string | blank | App registration (client) ID. Blank → not-configured mode. |
| `CONSOLE_ENTRA_CLIENT_SECRET` | string | blank | Confidential-client secret for the app registration above. |
| `CONSOLE_ENTRA_SCOPES` | space-separated string | `accounts.read accounts.write postings.read postings.write postings.reverse` | Scopes requested at sign-in — the ledger contract's five (see *Identity menu* above). |
| `CONSOLE_API_BASE_URL` | string (URL) | `http://localhost:8080` | Base URL of `DKNet.Accounts.Api` the console calls. Overridden by compose to the in-network address. |
| `CONSOLE_BASE_URL` | string (URL) | `http://localhost:3000` | The console's own externally reachable address. Every post-sign-in redirect is resolved against it; anything else is discarded. Also the base of the Entra redirect URI. |
| `CONSOLE_REDIS_URL` | string | `redis://localhost:6379` | Redis the console uses for the session and the cached token. Overridden by compose to the in-network address. |
| `CONSOLE_REDIS_KEY_PREFIX` | string | `console:` | Prefix on every key the console writes to Redis. |
| `CONSOLE_SESSION_SECRET` | string | a self-evident placeholder | Signs the session cookie. Ships non-blank so the stack boots as-is — generate your own with `openssl rand -base64 32` before any real deployment. |
| `CONSOLE_TOKEN_ENCRYPTION_KEY` | string | a real 32-byte placeholder | Encrypts the cached access/refresh token in Redis (exact 32 bytes required). Missing or the wrong length → the console exits non-zero, naming this key. Ships non-blank for the same reason as the session secret — generate your own with `openssl rand -hex 16`. |
| `CONSOLE_PORT` | int | `3000` | Port the console listens on; published as `${CONSOLE_PORT:-3000}:3000` in `docker-compose.yml`. |

`CONSOLE_ENTRA_TENANT_ID` and `CONSOLE_ENTRA_CLIENT_ID` are the only two keys genuinely blank in
`.env.sample` — fill those in; every other key already ships a working value.

### Entra app registration

Create a **Web** app registration with a client secret (confidential client — the console holds
the secret server-side, never in the browser):

- Redirect URI: `<CONSOLE_BASE_URL>/signin/callback`
- Grant it the scopes you list in `CONSOLE_ENTRA_SCOPES`
- `accounts.write`, `postings.write` and `postings.reverse` need a directory administrator's
  consent. Until it's granted, the console still asks for them at sign-in, and every ledger write
  — including recording and reversing a posting — fails against a real tenant regardless of what
  the console's UI allows on screen.

## ⚠️ Gotchas & limits

- **An accounts list is browsed and opened, never summed or exported.** No footer, no total row,
  no export control.
- **Neither the account detail screen's nor the Records screen's postings list carries a running
  balance.** Each row shows its own amount; no column carries the account's balance after that
  posting, and no total is worked out in the browser over a list.
- **Directory consent for `accounts.write`, `postings.write` and `postings.reverse` is not granted
  yet.** Every ledger write — including opening an account, recording a posting and reversing one
  — fails against a real tenant until an administrator grants it (see *Entra app registration*
  above).
- **A blank tenant or client ID is not an error.** The console starts and serves the
  not-configured page rather than failing — see *Sign-in not configured* above.
- **A missing `CONSOLE_TOKEN_ENCRYPTION_KEY` is an error.** The console refuses to start rather
  than cache a token unencrypted.
- **Fonts and every other visual asset are self-hosted at build** — no runtime request to a
  third-party host from a page.

## 🔗 Related docs

- [Configuration reference](configuration-reference.md) — the same pattern for
  `DKNet.Accounts.Api`'s own settings.
- [Design/README.md](../Design/README.md) — the design system the console's shell renders.
- [Root README](../README.md) — the service the console calls.
