# DKNet.Accounts.Api

An account and ledger API for single-currency accounts, postings, balances, and statements.

## 📖 Overview

- [Currencies](docs/features/currencies.md) defines the codes and precision accepted by accounts and postings.
- [Account groups](docs/features/account-groups.md) groups accounts by owner and classification.
- [Accounts](docs/features/accounts.md) holds balances and controls whether a movement is allowed.
- [Postings](docs/features/postings.md) records immutable movements, batches, and reversals.

Integrators call the API; maintainers run the service and operators deploy its image and chart.
The [API contract](docs/api-contract.md) lists every route, field, refusal, and ledger guarantee.
The [service background](docs/service-background.md) records business scope and earlier decisions.
When enabled, the machine-readable contract is available at `GET /openapi/v1.json`.

## 🏗️ Runtime architecture

![An operator uses the console to call the authenticated API, whose handlers write the selected database and relay stored ledger events to a broker.](docs/diagrams/runtime-architecture.svg)

The API selects PostgreSQL by default or SQL Server through `Database:Provider`.
The AppHost can start either database. The compose stack and Helm chart configure PostgreSQL only.
The diagram keeps its existing `runtime-architecture.*` name.

## 🌐 Downstream systems

| System | Role | Configuration |
|---|---|---|
| PostgreSQL or SQL Server | Stores ledger data and the outbound event outbox | `Database:Provider`, `ConnectionStrings:AppDb` |
| Redis | Distributed cache when configured; console sessions in the local stack | `ConnectionStrings:Redis` |
| RabbitMQ or Azure Service Bus | Receives outbound `ledger-events` when external messaging is enabled | `MessageBus:Transport`, broker connection string |
| OIDC issuer | Supplies and validates JWTs when authorization is enabled | `Authentication:Schemes:Bearer` |
| Azure App Configuration | Optional configuration source | `AzureAppConfig` |

See [configuration](docs/configuration-reference.md) and [deployment](docs/deployment.md) for how each dependency is wired.

## 🚀 Quick Start

From the repository root, install the .NET 10 SDK, Docker, and pnpm. Start Docker first.
The AppHost also starts the local console, Keycloak, Redis, RabbitMQ, and the chosen database.

```bash
# Working directory: repository root
dotnet restore DKNet.Accounts.sln
dotnet run --project ApiEndpoints/DKNet.Accounts.AppHost
```

Open the Aspire dashboard URL printed by `dotnet run` and copy the API's HTTP endpoint into `API_URL`.
The default AppHost database is PostgreSQL. To try SQL Server locally, run `dotnet run --project ApiEndpoints/DKNet.Accounts.AppHost -- --Database:Provider SqlServer`; any other value starts PostgreSQL in AppHost.

```bash
# Working directory: repository root; API_URL is the endpoint shown in Aspire
curl -i "$API_URL/healthz"
```

For a signed business call, follow the [integration guide](docs/integration-guide.md).
The separate [compose setup](docs/local-setup-entra.md) uses PostgreSQL and Entra ID.

## ✅ Verify it works

`GET /healthz` returns HTTP `200` and a healthy result when the configured health checks pass.
The [integration guide](docs/integration-guide.md) walks through a currency read, group creation,
account opening, posting, and statement read with their expected responses.

## 🛠️ Common commands

Run these from the repository root. Start Docker before integration tests.
The acceptance suite starts its own `postgres:16-alpine` container through Testcontainers.

| Purpose | Command |
|---|---|
| Restore | `dotnet restore DKNet.Accounts.sln` |
| Build | `dotnet build DKNet.Accounts.sln -c Release` |
| Test | `dotnet test DKNet.Accounts.sln --settings coverage.runsettings` |
| Run local stack | `dotnet run --project ApiEndpoints/DKNet.Accounts.AppHost` |
| Format check | `dotnet format DKNet.Accounts.sln --verify-no-changes` |

## ⚠️ Known limitations

- An older posting replays with its stored mixed-case idempotency key. New keyed requests are compared without regard to case and stored and returned lowercased.
- A keyed posting lookup lowercases the stored key, so it cannot use the unique index on the raw key column. It scans that calling system's postings.
- The per-account posting lock is process-local. See [posting concurrency](docs/features/postings.md#the-per-account-lock).
- Held funds are not implemented: `heldAmount` stays `0` and `availableBalance` equals `balance`.
- The chart's Azure Key Vault CSI workload identity needs the manual `clientID` patch described in [deployment](docs/deployment.md).

Further caller limits and deferred behavior live in the [API contract](docs/api-contract.md#-gotchas--limits).

## 📚 Documentation

| Page | What it answers |
|---|---|
| [Documentation index](docs/index.md) | All service guides and feature pages |
| [API contract](docs/api-contract.md) | Routes, fields, refusals, invariants, and caller limits |
| [Currencies](docs/features/currencies.md) | Currency registration and activation |
| [Account groups](docs/features/account-groups.md) | Group lifecycle and balances |
| [Accounts](docs/features/accounts.md) | Account lifecycle, floors, and balance reads |
| [Postings](docs/features/postings.md) | Recording, batches, reversals, and statements |
| [Configuration reference](docs/configuration-reference.md) | Settings, defaults, and database choice |
| [Deployment guide](docs/deployment.md) | Artifacts, chart prerequisites, verification, and rollback |
| [Service background](docs/service-background.md) | Business scope and decisions |
| [Accounts client](docs/accounts-client.md) | Typed .NET client |
| [Operations console](docs/console.md) | Local console and sign-in |

[MIT license](LICENSE).

## ❓ Open questions

| Question | Why it matters | Checked | Who can answer |
|---|---|---|---|
| Who owns production operation and support? | Readers need an escalation route. | Repository docs and workflows name no owner or support route. | Service owner |
| What recovery and service objectives apply? | Operators need a target for backup, restore, and alerting. | Chart and workflows contain no recovery or service objective policy. | Service owner |
