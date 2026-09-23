# DKNet Accounts Console

A Next.js operations console that signs an operator into `DKNet.Accounts.Api` with Microsoft
Entra ID and renders the console's frame — this delivery ships no screen content yet.

## ✨ Why use it?

- **One sign-in for ledger operations staff.** The console authenticates an operator against your
  Entra ID tenant instead of every screen needing its own credential handling.
- **The access token never reaches the browser.** Sign-in runs authorization code + PKCE
  server-side; only a signed `sessionId` cookie crosses to the browser, and the token itself is
  cached encrypted in Redis (`ui/lib/token-store.ts`, `ui/lib/session.ts`).
- **Matches the design system's shell.** `AppShell`, `Sidebar`, `PageHeader` and `UserMenu`
  (`ui/components/shell/`) render both light and dark themes from the same tokens the design
  system defines (`Design/README.md`).

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

> **No screen ships in this delivery.** Signing in reaches the framed shell — sidebar, page
> header, identity menu — with no ledger or administration screen behind it yet
> (`ui/app/page.tsx`).

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

Once signed in, the top bar states the identity provider, the tenant, the scopes the token
carries, and — struck through, with the consequence named — any scope the console knows about
that the token doesn't carry (`ui/components/shell/UserMenu.tsx`,
`Design/components/shell/UserMenu.d.ts`).

## ⚙️ Configuration reference

Every key below is read at container start (`ui/lib/config.ts`). **`.env.sample` on this branch
does not yet carry a console section** — the table follows the contract in DRK-1674 §5 instead;
reconcile against `.env.sample` once it lands.

| Key | Type | Default | Effect |
|---|---|---|---|
| `CONSOLE_ENTRA_TENANT_ID` | string | blank | Entra tenant (directory) ID. Blank → not-configured mode. |
| `CONSOLE_ENTRA_CLIENT_ID` | string | blank | App registration (client) ID. Blank → not-configured mode. |
| `CONSOLE_ENTRA_CLIENT_SECRET` | string | — | Confidential-client secret for the app registration above. |
| `CONSOLE_ENTRA_SCOPES` | space-separated string | — | Scopes requested at sign-in, e.g. `accounts.read postings.read postings.reverse`. |
| `CONSOLE_API_BASE_URL` | string (URL) | — | Base URL of `DKNet.Accounts.Api` the console calls. |
| `CONSOLE_BASE_URL` | string (URL) | — | The console's own externally reachable address. Every post-sign-in redirect is resolved against it; anything else is discarded. Also the base of the Entra redirect URI. |
| `CONSOLE_REDIS_URL` | string | — | Redis the console uses for the session and the cached token. |
| `CONSOLE_REDIS_KEY_PREFIX` | string | `console:` | Prefix on every key the console writes to Redis. |
| `CONSOLE_SESSION_SECRET` | string | — | Signs the session cookie. |
| `CONSOLE_TOKEN_ENCRYPTION_KEY` | string | — | Encrypts the cached access/refresh token in Redis. Missing → the console exits non-zero, naming this key. |
| `CONSOLE_PORT` | int | `3000` | Port the console listens on; published as `${CONSOLE_PORT:-3000}:3000` in `docker-compose.yml`. |

### Entra app registration

Create a **Web** app registration with a client secret (confidential client — the console holds
the secret server-side, never in the browser):

- Redirect URI: `<CONSOLE_BASE_URL>/signin/callback`
- Grant it the scopes you list in `CONSOLE_ENTRA_SCOPES`

## ⚠️ Gotchas & limits

- **No screen ships in this delivery.** Sign-in reaches the framed shell only — no ledger or
  administration screen exists yet.
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
