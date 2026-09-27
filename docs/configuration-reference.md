# Configuration Reference

Every configuration key this service reads, what it means, what it defaults to, what it changes, and
the code path that reads it. This service's own slices are `Currencies`, `AccountGroups`, `Accounts`
and `Postings`; its routes are listed in [the README's API contract](../README.md#the-api-contract).

## Where configuration comes from

The API is a stock `WebApplication.CreateBuilder(args)` host, so the standard ASP.NET Core order
applies — later sources win:

1. `DKNet.Accounts.Api/appsettings.json` — the base file. **This is what a deployed service runs with**,
   because this service ships no `appsettings.Production.json`.
2. `DKNet.Accounts.Api/appsettings.{Environment}.json` — `Development` and `Testing` overlays both ship.
3. User secrets, in `Development` only.
4. Environment variables — `Section__Key` with a double underscore, e.g.
   `FeatureManagement__RequireAuthorization=false`. These outrank every JSON file.
5. Command-line arguments.
6. Azure App Configuration, when `FeatureManagement:EnableAzureAppConfig` is on and its connection
   string resolves. `DKNet.Accounts.Api/Configs/AzureAppConfig/AzureAppConfigSetup.cs` appends it to
   `builder.Configuration` after `WebApplication.CreateBuilder(args)` has already added every source
   above, so it wins over the JSON files **and** over environment variables and command-line
   arguments.

One exception matters for tests. `DKNet.Accounts.Api/Program.cs` binds `FeatureOptions` on its first
lines, before a `WebApplicationFactory`'s `ConfigureAppConfiguration` overrides are merged. A test
fixture therefore cannot flip a feature flag with an in-memory entry — only an
`appsettings.{Environment}.json` file or a `FeatureManagement__<Flag>` environment variable lands
early enough.

## `ConnectionStrings`

| Key | Type | Shipped default | Effect | Read by |
|---|---|---|---|---|
| `AppDb` | string | `""` in the `Development` overlay; absent from the base file | The PostgreSQL connection for `CoreDbContext`. Without it the API cannot open a database connection. Supplied automatically when you launch through the Aspire host, which injects it from the `AppDb` resource. | `SharedConsts.DbConnectionString`; `DKNet.Accounts.Infra/Extensions/InfraSetup.cs` (`AddInfraServices`) and `DKNet.Accounts.Api/Configs/DbMigration.cs` (`RunMigrationAsync`) |
| `Redis` | string | not shipped in any file | Selects the distributed-cache backing store **and** the idempotency-key store. Set → `AddStackExchangeRedisCache` plus `AddIdempotencyWithRedisStore`. Unset → `AddDistributedMemoryCache` plus the in-process `AddIdempotentKey()` fallback, which is correct only for a single instance. Injected by the Aspire host from the `Redis` resource. | `SharedConsts.RedisConnectionString`; `DKNet.Accounts.Api/Configs/CacheConfig.cs` and `DKNet.Accounts.Api/Configs/AppConfig.cs` |
| `AzureBus` | string | `""` in the `Development` overlay | The Azure Service Bus namespace connection string. Non-empty **and** `FeatureManagement:EnableServiceBus` true is what adds the `AzureBus` child bus; either one missing leaves external messaging off while in-memory dispatch keeps working. | `SharedConsts.AzureBusConnectionString`; `DKNet.Accounts.Infra/Extensions/ServiceBusSetup.cs` |
| `AzureAppConfig` | string | **not shipped** | The Azure App Configuration endpoint URI. `AzureAppConfigSetup` looks it up under the name in `AzureAppConfig:ConnectionStringName`, which defaults to `AzureAppConfig`. Without it the integration silently no-ops even with the flag on. | `DKNet.Accounts.Api/Configs/AzureAppConfig/AzureAppConfigSetup.cs` |

> The base `appsettings.json` also ships `TEMPDb`, `AppConfig` and `AzureAppConfiguration` under
> `ConnectionStrings`. **No code reads any of the three** — see
> [Keys that ship but are never read](#keys-that-ship-but-are-never-read).

## `Authentication:Schemes:Bearer`

Bound by ASP.NET Core's own `AddJwtBearer()` configuration binding, which reads
`Authentication:Schemes:<SchemeName>`. `DKNet.Accounts.Api/Configs/Auth/AuthConfig.cs` calls
`AddAuthentication().AddJwtBearer()` with two inline options, `MapInboundClaims = false` and
`NameClaimType = "name"` (below) — everything else comes from configuration, so this section is
the whole *configurable* surface for token validation. The block is registered only when
`FeatureManagement:RequireAuthorization` is `true`.

`MapInboundClaims = false` and `NameClaimType = "name"` keep the principal's claims named the way the
token was issued (`scp`, `oid`, `email`, `name`) instead of being remapped to the long
`schemas.xmlsoap.org`/`schemas.microsoft.com` claim type URIs ASP.NET Core's default inbound mapping
would otherwise substitute.

| Key | Type | Shipped default | Effect |
|---|---|---|---|
| `Authentication:DefaultScheme` | string | `Bearer` | The scheme used when an endpoint names none. |
| `Authentication:Schemes:Bearer:MetadataAddress` | string (URL) | `https://login.microsoftonline.com/00000000-.../v2.0/.well-known/openid-configuration` — **placeholder** | The OIDC discovery document the scheme fetches its signing keys from. Rewritten by `--TenantId`. |
| `Authentication:Schemes:Bearer:ValidAudiences` | string array | `[ "api://your-api" ]` — **placeholder** | The audiences a token may carry. Exactly one entry by design: a token minted for any other resource is rejected. Rewritten by `--ApiAudience`. |
| `Authentication:Schemes:Bearer:ValidIssuer` | string (URL) | `https://sts.windows.net/00000000-.../` — **placeholder** | The issuer a token must declare. Rewritten by `--TenantId`. |

Signature validation is never disabled — `DKNet.Accounts.App.Tests/Architecture/JwtSignatureValidationTests.cs`
fails the build if the API source ever turns it off.

One extension seam sits next to this section and is registered with it, marked `TODO` in source and
meant to be replaced: `DKNet.Accounts.Api/Configs/Auth/SampleClaimsTransformation.cs` (an
`IClaimsTransformation`), applied to no shipped route.

The scope side is not a sample: `AuthConfig` registers one authorization policy per scope in
`ScopeNames.All`, each named after its scope string and evaluated by `HasScopeHandler` against the
`HasScopeRequirement` it carries. Every route group applies one of these policies —
`AccountsV1Endpoint`/`AccountGroupsV1Endpoint`/`CurrenciesV1Endpoint` via `[EndpointGroupScope]`,
`PostingsV1Endpoint` via `.RequireScope(...)`. See
[`endpoint-scope-declarations.md`](endpoint-scope-declarations.md).

## `Cors`

| Key | Type | Base `appsettings.json` | `appsettings.Development.json` | Effect |
|---|---|---|---|---|
| `Cors:AllowedOrigins` | string array | `[]` | `[ "http://localhost:3000", "http://localhost:5173" ]` | Deny-by-default allow-list. Empty or all-blank → neither `AddCors` nor `UseCors` is registered at all, so no `Access-Control-Allow-*` header is emitted. Non-empty → a default policy allowing exactly those origins, the methods and headers below, and nothing else. Credentials are never allowed on any path. |
| `Cors:AllowedMethods` | string array | `[ "GET", "POST", "PUT", "PATCH" ]` | — | The methods reflected in `Access-Control-Allow-Methods`. `DELETE` is absent by default, and the service does have one delete route — `DELETE /v1/account-groups/{id}`, on an empty group — so a browser front-end that deletes a group has to add `DELETE` here. See [Closing up](integration-guide.md#10-closing-up). Widen or narrow the list freely — an entry not listed is never reflected, so a preflight for it fails. |
| `Cors:AllowedHeaders` | string array | `[ "Authorization", "Content-Type", "Accept", "Idempotency-Key" ]` | — | The request headers reflected in `Access-Control-Allow-Headers`. `Idempotency-Key` is there because that's the header the posting routes actually read (`Record.cs`/`RecordBatch.cs`/`Reverse.cs`'s `[FromRequestHeader("Idempotency-Key")]`) — not `DKNet.AspCore.Idempotency`'s `X-Idempotency-Key` default, which this service doesn't use (`CrosConfig.cs:11-12`). No tracing header (`traceparent`, `X-Request-Id`, …) is enumerated — add yours if your front-end sends one. |

Entries in `AllowedOrigins` are absolute origins — scheme included, no trailing slash, no path. This
is a plain configuration array, not a `FeatureManagement` flag; the empty array is its off switch,
and it gates the other two keys as well — with no origin listed, CORS is not wired and the method
and header lists are never consulted.

`AllowedMethods` and `AllowedHeaders` fall back to the lists above only when the key is **absent**.
A key present but empty (`[]`) is honoured as "nothing allowed" rather than widened back to the
default, so a preflight for any method (or header) then fails. Read by
`DKNet.Accounts.Api/Configs/CrosConfig.cs`; behaviour pinned by
`DKNet.Accounts.App.Tests/Integration/Cors/CorsPolicyTests.cs`.

## `Security`

| Key | Type | Base `appsettings.json` | `appsettings.Development.json` | Effect |
|---|---|---|---|---|
| `Security:TrustedProxies` | string array of IP addresses | `[]` | — | The proxies whose `X-Forwarded-For` / `X-Forwarded-Proto` the service believes. **Empty — as shipped — means no forwarded information is honoured at all**: `DKNet.Accounts.Api/Configs/ForwardedHeadersConfig.cs` sets `ForwardedHeaders.None`, so `Connection.RemoteIpAddress` stays the immediate peer and rate limiting partitions on it. Non-empty → `XForwardedFor | XForwardedProto` are applied, but only when the immediate peer is one of the listed addresses. |

This is the one key a production host behind an ingress, load balancer or CDN **must** supply — until
it does, every request appears to come from that ingress and shares one rate-limit partition. List
the address the ingress connects from, one entry per proxy:

```json
"Security": {
  "TrustedProxies": [ "10.0.0.4", "10.0.0.5" ]
}
```

Entries are parsed with `IPAddress.Parse`, so each must be a single literal IPv4 or IPv6 address —
a CIDR range such as `10.0.0.0/8` is **not** accepted and fails at startup with a `FormatException`.
`KnownProxies` and `KnownIPNetworks` are cleared before the list is applied, so ASP.NET Core's
seeded loopback entry is gone too: `127.0.0.1` is trusted only if you list it.

The whole module is gated on `FeatureManagement:EnableForwardedHeaders` (default `true`, and it stays
`true` in the `Development` overlay too — only `Security:TrustedProxies` is empty locally). Turning
the flag off and leaving the list empty are equivalent in effect; the flag exists so the middleware
can be taken out of the pipeline entirely, for local work or otherwise.

## `Https`

| Key | Type | Class default | Base `appsettings.json` | Effect |
|---|---|---|---|---|
| `Https:HstsMaxAgeDays` | int | `365` | `365` | The `max-age` announced by `Strict-Transport-Security`, in days. `Preload` is requested **only** when this value is at least 365 — the preload list's minimum — and is otherwise switched off, so a shortened max-age never announces preload it cannot qualify for. `IncludeSubDomains` is always on. |

Read by `DKNet.Accounts.Api/Configs/HttpsConfig.cs`, and only when `FeatureManagement:EnableHttps` is
`true` (the base file's value; `false` in the `Development` and `Testing` overlays). Lowering it is
the safe way to try HSTS out on a domain you are not ready to commit for a year — `"HstsMaxAgeDays":
1` announces one day and no preload. The header itself has exactly one owner: the security-headers
middleware deliberately does not emit `Strict-Transport-Security`, so it is never sent twice.

## `RequestBounds`

Bound to `RequestBoundsOptions` and applied only when `FeatureManagement:EnableRequestBounds` is
`true` (default `true`, and it stays `true` in the `Development` overlay too). This service states
all three bounds rather than inheriting Kestrel's, so it is bounded with no configuration supplied.

| Key | Type | Class default | Base `appsettings.json` | Effect when relaxed | Framework default it replaces |
|---|---|---|---|---|---|
| `RequestBounds:RequestTimeoutSeconds` | int | `30` | `30` | The default request-timeout policy's lifetime. A request still running when it elapses is answered `504 Gateway Timeout`. Raise it for a long-running endpoint, or opt that endpoint out with `.DisableRequestTimeout()`. | none — ASP.NET Core caps request lifetime only if you ask it to |
| `RequestBounds:MaxRequestBodySizeBytes` | long | `1048576` (1 MB) | `1048576` | `KestrelServerOptions.Limits.MaxRequestBodySize`. A larger body is rejected with `413 Payload Too Large`. Raise it for file upload; `null` is not expressible here, so there is no "unlimited" value through configuration. | ~30 MB |
| `RequestBounds:RequestHeadersTimeoutSeconds` | int | `10` | `10` | How long Kestrel waits for the complete request headers before dropping the connection — the slow-headers bound. | 30 s |

Set only the keys you want to change; a partially-specified section keeps the class default for the
rest. The same module also sets `KestrelServerOptions.AddServerHeader = false`, which is **not**
configurable: no response names the web-server product. `UseRequestTimeouts()` is registered after
`UseRouting()`, as ASP.NET Core requires, so the timeout applies to endpoint execution — a request
that is both oversized and slow is rejected on size first, at the server, before the timeout policy
is reached. Read by `DKNet.Accounts.Api/Configs/RequestBoundsConfig.cs`.

## `RateLimit`

Bound to `RateLimitOptions` and applied only when `FeatureManagement:EnableRateLimit` is `true`.
The limiter is a chained `PartitionedRateLimiter`: a fixed-window limiter and a concurrency
limiter, both partitioned by the same key.

| Key | Type | Class default | Base `appsettings.json` | `appsettings.Development.json` | Effect |
|---|---|---|---|---|---|
| `RateLimit:DefaultRequestLimit` | int | `2` | `100` | `1` | `PermitLimit` on the fixed-window limiter — requests allowed per window, per partition. |
| `RateLimit:DefaultConcurrentLimit` | int | `2` | `20` | `1` | `PermitLimit` on the concurrency limiter — in-flight requests allowed at once, per partition. |
| `RateLimit:TimeWindowInSeconds` | int | `1` | `1` | `10` | The fixed window's length. |

Both limiters use `QueueLimit = 0`, so an over-limit request is rejected immediately with
`429 Too Many Requests` rather than queued. The partition key is
`User.Identity.Name`, falling back to the remote IP address, falling back to the request host
(`DKNet.Accounts.Api/Configs/RateLimits/RateLimitKeyProvider.cs`) — so unauthenticated callers are
limited per IP and authenticated callers per user.

That remote IP is `Connection.RemoteIpAddress` *after* the forwarded-headers middleware has had its
say, which is why [`Security:TrustedProxies`](#security) matters to rate limiting: list your ingress
and each client behind it gets its own budget; leave it empty and they all share the ingress's. The
provider never reads `X-Forwarded-For` itself, so a peer that is not a configured trusted proxy
cannot claim another client's identity and spend its budget.

The base file must carry this section explicitly, because the class defaults are 2 requests per
second — an outage, not a rate limit.
`DKNet.Accounts.App.Tests/Architecture/SecureDefaultAppSettingsTests.cs` asserts it stays there. The
shipped production numbers are a placeholder ceiling to tune, not a researched limit.

Both `IRateLimitKeyProvider` and `IRateLimitOptionsProvider` are public interfaces you can replace,
both registered in `DKNet.Accounts.Api/Configs/RateLimits/RateLimitConfig.cs`.

## `AzureAppConfig`

Bound to `AzureAppConfigOptions` and read only when `FeatureManagement:EnableAzureAppConfig` is
`true`. **The base `appsettings.json` ships no `AzureAppConfig` section at all**, so every value
below falls through to its class default.

| Key | Type | Class default | Effect | Read by |
|---|---|---|---|---|
| `AzureAppConfig:ConnectionStringName` | string | `AzureAppConfig` | Which `ConnectionStrings` entry holds the App Configuration endpoint URI. | `AzureAppConfigSetup.AddAzureAppConfig` |
| `AzureAppConfig:Label` | string | `null` → falls back to `SharedConsts.ApiName` (`DKNet.Accounts.Api`) | The label filter applied to `op.Select(KeyFilter.Any, label)`, so only values labelled for this API are loaded. | `AzureAppConfigSetup.AddAzureAppConfig` |
| `AzureAppConfig:LoadFeatureFlags` | bool | `true` | **Declared but never read.** `UseFeatureFlags()` is called unconditionally. | — |
| `AzureAppConfig:FeatureFlagPrefix` | string | `""` | **Declared but never read.** No prefix filter is applied. | — |
| `AzureAppConfig:RefreshIntervalInMinutes` | int | `300` | **Declared but never read.** The refresh interval is hard-coded to 30 minutes in `ConfigureRefresh(c => c.RegisterAll().SetRefreshInterval(TimeSpan.FromMinutes(30)))`. | — |

The connection is opened with `DefaultAzureCredential`, so the host needs a managed identity or a
local Azure login with read access to the store. If the connection string is missing or blank the
method returns without adding the source — the flag alone does nothing.

The three "declared but never read" rows are an options-class-versus-setup mismatch in source, not
a documentation gap. Wiring them up is a code change; it is recorded on this documentation ticket
rather than made here.

## Telemetry

`DKNet.Accounts.Api/Configs/LogConfigs.cs` runs before anything else in `Program.cs`. When
`FeatureManagement:EnableOpenTelemetry` is `false` (the shipped default) it adds a console logger
in `DEBUG` builds and returns — no tracing, no metrics, no exporter. When `true` it clears the
logging providers, adds the OpenTelemetry logger, and registers ASP.NET Core plus `HttpClient`
tracing and metrics instrumentation, with a console exporter in `DEBUG` builds only.

| Key | Type | Shipped default | Effect | Read by |
|---|---|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | string (URL) | `http://localhost:4317` in the base file | Non-blank → `UseOtlpExporter()` is added. This service reads the key only as a presence check; the exporter resolves its own endpoint through the OpenTelemetry SDK's standard configuration for this key. | `LogConfigs.AddLogConfig` |
| `AzureMonitor:ConnectionString` | string | `""` in the base file | Non-blank → `UseAzureMonitor()` is added, shipping traces, metrics and logs to Application Insights. Blank, as shipped, means no Azure Monitor exporter. | `LogConfigs.AddLogConfig` |
| `Logging:LogLevel:*` | string | `Default: Information`, `Microsoft: Warning`, `Microsoft.Hosting.Lifetime: Warning`; the `Development` overlay drops to `Debug`/`None`/`None` | Standard ASP.NET Core log filtering. Note that `EnableOpenTelemetry` clears the providers, so these filters then apply to the OpenTelemetry logger. | ASP.NET Core logging |

Both exporter keys are additive: set both and both exporters run.

## `DKNet.Accounts.AppHost`

The Aspire application host (`DKNet.Accounts.AppHost/AppHost.cs`) carries no business logic and reads
no `SampleData` or other feature key: it provisions a `Redis` container and a `Postgres` container,
adds the `AppDb` database to the Postgres resource, and starts `DKNet.Accounts.Api` wired to both
connection strings. It is not part of what gets published — `dotnet run --project DKNet.Accounts.Api`
on its own skips it, so `ConnectionStrings:AppDb` and `ConnectionStrings:Redis` become yours to
supply directly.

## FeatureManagement flags

Class defaults come from `DKNet.Accounts.Share/Options/FeatureOptions.cs`. The remaining columns are
what the shipped config files actually set. `—` means the file does not name the key, so the value
falls through to the column on its left.

| Flag | Class default | base `appsettings.json` (Production) | `appsettings.Development.json` | `appsettings.Testing.json` |
|---|---|---|---|---|
| `EnableAntiforgery` | `false` | `false` | `false` | — |
| `EnableAzureAppConfig` | `false` | `false` | `false` | — |
| `EnableForwardedHeaders` | `true` | `true` | `true` | — |
| `EnableHealthCheck` | `true` | — | — | — |
| `EnableHttps` | `false` | **`true`** | **`false`** | `false` |
| `EnableOpenTelemetry` | `false` | `false` | — | — |
| `EnableRateLimit` | `true` | `true` | **`false`** | `false` |
| `EnableRequestBounds` | `true` | `true` | `true` | — |
| `EnableSecurityHeaders` | `true` | `true` | `true` | — |
| `EnableServiceBus` | `false` | `true` | `false` | — |
| `EnableSwagger` | `false` | `false` | `true` | — |
| `EnableVersioning` | `true` | `true` | — | — |
| `RequireAuthorization` | `false` | **`true`** | `false` | `false` |
| `RunDbMigrationWhenAppStart` | `false` | `false` | `true` | — |

`RequireAuthorization`, `EnableHttps`, `EnableRateLimit`, `EnableSecurityHeaders`,
`EnableForwardedHeaders` and `EnableRequestBounds` are the secure-by-default set: this service
deployed without a config change authenticates every request, applies HSTS, rate-limits, redirects to
HTTPS when an HTTPS port is configured, sends the security response headers, bounds every request, and
honours forwarded caller information only from a proxy you listed. Where each control sits in the
pipeline: [`api-pipeline.md`](api-pipeline.md).

The redirect is the one conditional part. `EnableHttps` always adds both `UseHsts()` and
`UseHttpsRedirection()` (`DKNet.Accounts.Api/Configs/HttpsConfig.cs`), but `UseHttpsRedirection` only
redirects when ASP.NET Core can determine an HTTPS port — from `ASPNETCORE_HTTPS_PORT`, from
`HttpsRedirectionOptions`, or from the server's own listening addresses. The container this service
publishes to (`mcr.microsoft.com/dotnet/aspnet:10.0-alpine`, set as `ContainerBaseImage` in
`DKNet.Accounts.Api.csproj`) carries none of them, so a service running HTTP-only behind a
TLS-terminating ingress logs `Failed to determine the https port for redirect` and passes the request
through unredirected. Set `ASPNETCORE_HTTPS_PORT` if you need the redirect itself; HSTS is unaffected.

`dotnet run` locally picks up `appsettings.Development.json`, which relaxes exactly three of the
secure-by-default set: `EnableHttps`, `RequireAuthorization` and `EnableRateLimit`. It leaves
`EnableSecurityHeaders`, `EnableForwardedHeaders` and `EnableRequestBounds` all `true` — a local
`dotnet run` still gets security headers, forwarded-header handling and the request bounds; only the
HTTPS redirect, authentication and rate limiting step aside. Development additionally turns
`EnableSwagger` and `RunDbMigrationWhenAppStart` on and `EnableServiceBus` off, none of which are
security flags.

Both test suites boot under the `Testing` environment
(`DKNet.Accounts.App.TestSupport/TestApiFactoryBase.cs` calls `UseEnvironment("Testing")`).
`appsettings.Testing.json` names only the same three flags — `RequireAuthorization`, `EnableHttps` and
`EnableRateLimit` — all `false`; it names nothing else, so every other flag falls through to the base
file and stays on under `Testing` too. Never run a deployed instance with
`ASPNETCORE_ENVIRONMENT=Testing`: it drops all three protections at once. To relax a flag for an
environment, add it to that environment's overlay — or set the `FeatureManagement__<Flag>`
environment variable, which outranks every JSON file.

Because `EnableRateLimit` is on in the base file, the base file also carries an explicit `RateLimit`
section so the limiter never falls back to `RateLimitOptions`'s 2-requests-per-second class defaults —
see [`RateLimit`](#ratelimit) above.

`EnableServiceBus` is the one flag whose `true` in the base file is not sufficient on its own: it
gates the **Azure** Service Bus child bus, which `DKNet.Accounts.Infra/Extensions/ServiceBusSetup.cs`
adds only when the flag is on **and** `ConnectionStrings:AzureBus` is non-empty. This service declares
no `Produce`/`Consume` topology on that child bus today — no domain event is forwarded externally —
so turning the flag on with no topology added has no observable effect yet; the in-memory child bus
that carries internal command/query dispatch is registered unconditionally regardless of the flag.

> CORS is deliberately absent from this table. It is configured by the `Cors:AllowedOrigins` array,
> not by a flag — an empty array is its off switch. See [`Cors`](#cors) above.

## Framework-owned keys

| Key | Shipped default | Effect |
|---|---|---|
| `AllowedHosts` | `"*"` in the `Development` overlay only | ASP.NET Core's host-filtering middleware. Absent from the base file, where the framework default (`*`) applies. Front a deployed service with an ingress that enforces the host, or set this explicitly. |

## Keys that ship but are never read

Each of these appears in a shipped `appsettings*.json` and is bound by nothing. They are inert —
setting them changes no behaviour.

| Key | File | Why it is dead |
|---|---|---|
| `ConnectionStrings:TEMPDb` | base `appsettings.json` | A leftover name. The database connection is read from `AppDb` (`SharedConsts.DbConnectionString`). |
| `ConnectionStrings:AppConfig` | base `appsettings.json` | `AzureAppConfigOptions.ConnectionStringName` defaults to `AzureAppConfig`, not `AppConfig`. |
| `ConnectionStrings:AzureAppConfiguration` | base `appsettings.json` | Same reason — the looked-up name is `AzureAppConfig`. |
| The whole `AzureAppConfiguration` section (`KeyPrefix`, `Label`, `CacheExpirationInSeconds`, `LoadFeatureFlags`, `FeatureFlagPrefix`) | base `appsettings.json` | `AzureAppConfigOptions.Name` is `AzureAppConfig`. Nothing binds a section called `AzureAppConfiguration`, and `KeyPrefix`/`CacheExpirationInSeconds` are not properties on the options class at all. |
| `OTEL_SERVICE_NAME` | base `appsettings.json` | No code in this service reads it. The OpenTelemetry SDK resolves the service name from the environment variable of the same name, not from this configuration entry. |
| `ApplicationInsights:InstrumentationKey` | `appsettings.Development.json` | Azure Monitor is wired from `AzureMonitor:ConnectionString`; instrumentation keys are not read anywhere. |

Removing them is a source change to the shipped `appsettings*.json` files, out of scope for this
documentation page and recorded on the ticket instead.

## Overriding a key without editing a file

Any key above can be set as an environment variable by replacing `:` with `__`:

```bash
export FeatureManagement__RequireAuthorization=false
export ConnectionStrings__AppDb="Host=localhost;Username=postgres;Password=postgres;Database=AppDb"
export RateLimit__DefaultRequestLimit=500
export Cors__AllowedOrigins__0="https://app.example.com"
```

Environment variables outrank every JSON file, and — unlike an in-memory test override — they are
in place before `Program.cs` binds `FeatureOptions`. The one source that outranks them is Azure App
Configuration, which is appended after the host builder has already read the environment.
