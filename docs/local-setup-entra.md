# Local setup with Microsoft Entra ID

Run the whole stack on your machine — Postgres, Redis, `DKNet.Accounts.Api` and the
[operations console](console.md) — signing in through a real Entra ID tenant, with authorization
**on**. Three steps: register two Entra apps, fill in `.env`, start `docker compose`.

**Prerequisites:** Docker, the Azure CLI signed in to the tenant you want to use (`az login`), and
rights to create app registrations there. Granting admin consent (step 1.3) needs a directory
administrator; in a personal tenant that's you.

## How the pieces fit

| App registration | Kind | What it's for |
|---|---|---|
| `DKNet.Accounts.Api (local)` | API (no redirect, no secret) | Exposes the ledger's five scopes. Its client ID is the token **audience** the API accepts. |
| `DKNet.Accounts.Console (local)` | Web, confidential client | Signs the operator in (authorization code + PKCE), holds the client secret server-side, and asks for the API's scopes. |

The console gets a v2 access token for the API and forwards it on every call. The API checks
signature, issuer and audience (`Authentication:Schemes:Bearer:*`), then checks each route's
scope against the token's `scp` claim (`HasScopeHandler` in
`ApiEndpoints/DKNet.Accounts.Api/Configs/Auth/SampleAuthorizationRequirement.cs`).

| Scope | Consent | Gates |
|---|---|---|
| `accounts.read` | User | Reading currencies, groups and accounts |
| `accounts.write` | Admin | Creating and changing currencies, groups and accounts |
| `postings.read` | User | Reading postings and statements |
| `postings.write` | Admin | Recording postings and batches |
| `postings.reverse` | Admin | Reversing a posting |

## 1. Set up the Entra apps

The commands below are bash/zsh and use only the Azure CLI. Run them in one shell session — later
steps reuse the variables. They print the values step 2 needs.

### 1.1 The API app — expose the scopes

```bash
TENANT_ID=$(az account show --query tenantId -o tsv)

API_ID=$(az ad app create --display-name "DKNet.Accounts.Api (local)" \
  --sign-in-audience AzureADMyOrg --query appId -o tsv)
API_OID=$(az ad app show --id "$API_ID" --query id -o tsv)
az ad sp create --id "$API_ID" -o none

scope() { # value, consent type (User|Admin), description
  printf '{"id":"%s","value":"%s","type":"%s","isEnabled":true,"adminConsentDisplayName":"%s","adminConsentDescription":"%s","userConsentDisplayName":"%s","userConsentDescription":"%s"}' \
    "$(uuidgen | tr A-Z a-z)" "$1" "$2" "$3" "$3" "$3" "$3"
}

az rest --method PATCH --url "https://graph.microsoft.com/v1.0/applications/$API_OID" \
  --headers Content-Type=application/json --body "{
  \"identifierUris\": [\"api://$API_ID\"],
  \"api\": {
    \"requestedAccessTokenVersion\": 2,
    \"oauth2PermissionScopes\": [
      $(scope accounts.read    User  'Read accounts and groups'),
      $(scope accounts.write   Admin 'Create and change accounts and groups'),
      $(scope postings.read    User  'Read postings'),
      $(scope postings.write   Admin 'Record postings'),
      $(scope postings.reverse Admin 'Reverse postings')
    ]
  }
}"
```

`requestedAccessTokenVersion: 2` matters: it makes Entra issue v2 tokens, whose issuer is
`https://login.microsoftonline.com/<tenant>/v2.0` and whose audience is the API's client ID —
exactly what step 2 configures the API to accept.

### 1.2 The console app — web sign-in with a secret

```bash
CONSOLE_ID=$(az ad app create --display-name "DKNet.Accounts.Console (local)" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris http://localhost:3000/signin/callback --query appId -o tsv)
CONSOLE_OID=$(az ad app show --id "$CONSOLE_ID" --query id -o tsv)
az ad sp create --id "$CONSOLE_ID" -o none

# JSON arrays of the five scope ids, built by az itself (no shell word-splitting — zsh-safe).
ACCESS=$(az ad app show --id "$API_ID" -o json \
  --query "api.oauth2PermissionScopes[].{id: id, type: 'Scope'}")
IDS=$(az ad app show --id "$API_ID" -o json --query "api.oauth2PermissionScopes[].id")

# The console asks for all five API scopes…
az rest --method PATCH --url "https://graph.microsoft.com/v1.0/applications/$CONSOLE_OID" \
  --headers Content-Type=application/json --body "{
  \"requiredResourceAccess\": [{\"resourceAppId\": \"$API_ID\", \"resourceAccess\": $ACCESS}]
}"

# …and the API pre-authorizes the console for them, so sign-in shows no consent prompt.
az rest --method PATCH --url "https://graph.microsoft.com/v1.0/applications/$API_OID" \
  --headers Content-Type=application/json --body "{
  \"api\": {\"preAuthorizedApplications\": [{\"appId\": \"$CONSOLE_ID\", \"delegatedPermissionIds\": $IDS}]}
}"

CONSOLE_SECRET=$(az ad app credential reset --id "$CONSOLE_ID" \
  --display-name local-dev --years 1 --query password -o tsv)
```

The redirect URI is `<CONSOLE_BASE_URL>/signin/callback`. If you run the console on a port other
than 3000, register that address instead (or as well):
`az ad app update --id "$CONSOLE_ID" --web-redirect-uris http://localhost:3000/signin/callback http://localhost:4000/signin/callback`.

### 1.3 Grant admin consent

`accounts.write`, `postings.write` and `postings.reverse` are admin-consent scopes. Without this
step you can sign in and read, but every ledger write is refused.

```bash
az ad app permission admin-consent --id "$CONSOLE_ID"
```

If you aren't a directory administrator, ask one to run it (or to press **Grant admin consent** on
the console app's *API permissions* page in the Entra admin center).

### 1.4 Print the values for `.env`

```bash
echo "TENANT_ID=$TENANT_ID"
echo "API_ID=$API_ID"
echo "CONSOLE_ID=$CONSOLE_ID"
echo "CONSOLE_SECRET=$CONSOLE_SECRET"   # shown once — copy it now
```

> **Portal instead of the CLI?** In the Entra admin center → *App registrations*: create the API app,
> set *Expose an API* → Application ID URI `api://<client-id>` and add the five scopes above; in its
> *Manifest* set `"requestedAccessTokenVersion": 2`. Create the console app as a **Web** platform
> with the redirect URI above, add a client secret, add the five scopes under *API permissions → My
> APIs*, and grant admin consent. Optionally add the console's client ID under the API app's
> *Expose an API → Authorized client applications*.

## 2. Update the `.env` file

`docker-compose.yml` reads `.env` for both variable substitution and the containers'
environment. Start from the sample — it always carries the current key set:

```bash
cp .env.sample .env
```

Then set these keys, replacing `<…>` with the step 1.4 values:

```dotenv
# --- API: accept Entra v2 tokens for the API app ---
FeatureManagement__RequireAuthorization=true
Authentication__Schemes__Bearer__MetadataAddress=https://login.microsoftonline.com/<TENANT_ID>/v2.0/.well-known/openid-configuration
Authentication__Schemes__Bearer__ValidIssuer=https://login.microsoftonline.com/<TENANT_ID>/v2.0
Authentication__Schemes__Bearer__ValidAudiences__0=<API_ID>
Authentication__Schemes__Bearer__ValidAudiences__1=api://<API_ID>

# --- Console: sign in through the console app ---
CONSOLE_ENTRA_TENANT_ID=<TENANT_ID>
CONSOLE_ENTRA_CLIENT_ID=<CONSOLE_ID>
CONSOLE_ENTRA_CLIENT_SECRET=<CONSOLE_SECRET>
CONSOLE_ENTRA_SCOPES=api://<API_ID>/accounts.read api://<API_ID>/accounts.write api://<API_ID>/postings.read api://<API_ID>/postings.write api://<API_ID>/postings.reverse
```

And replace the two placeholder secrets with your own:

```bash
openssl rand -base64 32   # → CONSOLE_SESSION_SECRET
openssl rand -hex 16      # → CONSOLE_TOKEN_ENCRYPTION_KEY (must be exactly 32 characters)
```

Everything else in `.env.sample` already works as shipped. `.env` is git-ignored — never commit it,
it holds the client secret.

**Scopes must be fully qualified.** `.env.sample` lists them bare (`accounts.read …`). Entra treats a
bare scope as a Microsoft Graph scope and refuses it, so with a real tenant prefix each one with
`api://<API_ID>/`. The token still carries the bare names in `scp`, which is what the API and the
console's identity menu check.

## 3. Launch docker compose locally

```bash
docker compose build --pull     # --pull refreshes the .NET/Node base images
docker compose up -d --wait     # returns once every service reports healthy
open http://localhost:3000      # macOS; xdg-open on Linux
```

`./run.sh` at the repository root does the same three steps, then follows the logs.

`COMPOSE_PROFILES=api,console` in `.env` starts the whole stack: Postgres, Redis, the API on
`http://localhost:${API_PORT:-8080}` and the console on `http://localhost:${CONSOLE_PORT:-3000}`.
The API migrates the database on start (`FeatureManagement__RunDbMigrationWhenAppStart=true`).

### Check it works

```bash
docker compose ps                                                   # all four: healthy
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/v1/currencies   # 401 — auth is on
```

Then sign in at `http://localhost:3000`. You land on the Overview screen, and the identity menu
(top right) lists the five scopes your token carries.

To call the API with a real token outside the console, get one for the API app (the Azure CLI
must be allowed to request it — add the CLI's client ID `04b07795-8ddb-461a-bbee-02f9e1bf7b46` to
the API app's authorized client applications first):

```bash
TOKEN=$(az account get-access-token --scope "api://$API_ID/accounts.read" --query accessToken -o tsv)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/v1/currencies
```

## ⚠️ Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Sign-in answer refused: missing code or state` | Entra redirected back with `error=…` instead of a `code` — look at the `error_description` in the browser's address bar. Usually a bare (unprefixed) scope, a redirect URI that doesn't match, or a console build older than the fix that discovers Entra's `/v2.0` metadata. | Prefix the scopes (step 2), register the exact redirect URI (step 1.2), rebuild the console (`docker compose build --pull console`). |
| Console shows the *not configured* page | `CONSOLE_ENTRA_TENANT_ID` or `CONSOLE_ENTRA_CLIENT_ID` is blank. | Fill both in and `docker compose up -d console`. |
| Every API call returns `401` with a token | Issuer or audience mismatch — typically a v1 token (issuer `https://sts.windows.net/…`) because `requestedAccessTokenVersion` isn't `2`. | Redo the PATCH in step 1.1, sign out and in again. |
| Reads work, every write returns `403` | Admin consent missing for the write scopes. | Step 1.3. |
| API image build fails with `CS8620 … differences in the nullability of reference types` | A stale cached `mcr.microsoft.com/dotnet/sdk:10.0` image with an older C# compiler. | `docker pull mcr.microsoft.com/dotnet/sdk:10.0`, then build with `--pull`. |
| API restarts in a loop; log says `password authentication failed for user "accounts"` | The `pgdata` volume was created with a different `POSTGRES_PASSWORD` — Postgres only reads it on first init. | Keep the data: `docker compose exec postgres psql -U accounts -d accounts -c "ALTER USER accounts WITH PASSWORD '<your password>';"`. Or start fresh: `docker compose down -v`. |
| Sign-in fails after a year | The `local-dev` client secret expired. | Rerun the `credential reset` line in step 1.2 and update `CONSOLE_ENTRA_CLIENT_SECRET`. |

## Clean up

```bash
az ad app delete --id "$CONSOLE_ID"
az ad app delete --id "$API_ID"
docker compose down -v    # also drops the Postgres and Redis volumes
```

## 🔗 Related docs

- [Operations console](console.md) — every console setting and what the console does once signed in.
- [Configuration reference](configuration-reference.md) — every API setting, including `Authentication`.
- [Integration guide](integration-guide.md) — calling the API as a machine client.
