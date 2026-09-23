# DKNet Accounts Console

A Next.js operations console that signs an operator into `DKNet.Accounts.Api` with Microsoft
Entra ID, and reads and writes the ledger through its own pass-through endpoint. No ledger
*screen* ships yet (`ui/app/page.tsx` still renders the frame with no data), but the access
layer, the endpoint and the ledger component kit do.

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

> **No ledger screen ships yet.** Signing in reaches the framed shell — sidebar, page header,
> identity menu — with no ledger or administration screen behind it (`ui/app/page.tsx`). The
> ledger access layer, the pass-through endpoint and the ledger component kit this screen will
> be built from already ship — see *Features* below.

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

### Ledger pass-through endpoint

`ui/app/api/ledger/[...route]/route.ts` proxies `GET`/`POST`/`PATCH`/`DELETE` under `/api/ledger/…`
to `DKNet.Accounts.Api`: it resolves the operator's session, decrypts her access token
server-side, forwards the caller's `Idempotency-Key`, and returns the ledger service's answer
unchanged. Every inbound request is checked against `isLedgerRouteAllowed`
(`ui/lib/api/routes.ts`) — the set of routes the generated OpenAPI contract declares — and refused
before any outbound call if the route isn't in it. The token never crosses back to the browser —
the service still checks every permission itself, so a control disabled on screen for a missing
scope is convenience only, not the enforcement point.

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
- `accounts.write` and `postings.write` need a directory administrator's consent. Until it's
  granted, the console still asks for them at sign-in, and every ledger write fails against a
  real tenant regardless of what the console's UI allows on screen.

## ⚠️ Gotchas & limits

- **No ledger screen ships yet.** Sign-in reaches the framed shell only — the ledger access
  layer, pass-through endpoint and component kit exist, but no screen wires them together.
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
