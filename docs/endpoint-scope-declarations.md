# Endpoint Scope Declarations

How an endpoint group declares, once per HTTP method, the scope every route in it requires — and why
the API refuses to start when a declaring group leaves a method uncovered.

Read this before you add a route to an endpoint group, and before you add a group of your own.

The mechanism lives in `DKNet.Accounts.Api/Configs/Auth/GroupScopeAuthorization.cs`. The scope names
it takes are the constants in `DKNet.Accounts.Api/Configs/Auth/SampleAuthorizationRequirement.cs`
(`ScopeNames`), each of which is also a registered authorization policy name
(`DKNet.Accounts.Api/Configs/Auth/AuthConfig.cs:40-41`).

## Declaring a group's scopes

Call `DeclareGroupScope(scope, params httpMethods)` at the top of `IEndpointConfig.Map`, before any
route is mapped. It is chainable, and you call it once per scope:

```csharp
// ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs:24
group.DeclareGroupScope(ScopeNames.AccountsRead, "GET")
    .DeclareGroupScope(ScopeNames.AccountsWrite, "POST", "PUT", "PATCH");
```

Those two lines are the whole permission model for the accounts group: every `GET` it serves requires
`accounts.read`, and every `POST`, `PUT` and `PATCH` requires `accounts.write`. No route below
repeats it. The account-groups endpoint declares the same way, over its own four methods
(`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/AccountGroups/AccountGroupsV1Endpoint.cs:23-24`).

A declaration applies to **every** route the group registers for that method, including routes the
CRUD generator produces — `MapAccountGroupCrud` registers the account group's whole route set, and no
route in it names a scope of its own. `MapAccountCrud` does the same for accounts.

The declaration is applied through a `Finally` convention on the group, which runs after every other
convention on each endpoint (`GroupScopeAuthorization.cs:52`). That is what lets a single route
override it, below.

## Overriding one route

A route that names its own scope keeps it. Use `RequireScope(group, scope)` on that route, exactly as
every route did before group declarations existed:

```csharp
// ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs:111
group.MapGet("{id:guid}/statement", async (/* … */) => { /* … */ })
    .RequireScope(group, ScopeNames.PostingsRead)
```

`GET /v1/accounts/{id}/statement` therefore requires `postings.read`, even though the accounts group
declares `accounts.read` for `GET`. It is a read over postings, not over the account record, so it is
priced as one.

An override also satisfies the startup coverage check for that route — a route with its own scope is
covered whether or not the group declares its method.

## Opening one route to anonymous callers

`.AllowAnonymous()` on the route wins over the group declaration. Nothing else is needed, and the
group keeps its declarations for every other route:

```csharp
// ApiEndpoints/DKNet.Accounts.App.Tests/Integration/Auth/GroupScopeCoverageTests.cs:80
var group = endpoints.MapGroup($"/{TestGroupName}").WithDisplayName(TestGroupName);
group.DeclareGroupScope(ScopeNames.AccountsRead, "GET");
group.MapGet("/open", () => Results.Ok()).AllowAnonymous();
```

`GET /test-only-group/open` then answers a request carrying no token at all, while every other `GET`
in that group still requires `accounts.read`.

No shipped ledger route is anonymous. The only anonymous endpoints this service publishes are the
public health probes at `/healthz` and `/`, and they sit outside any endpoint group
(`DKNet.Accounts.Api/Configs/Healthz/HealthzConfig.cs:49-50`).

## Which rule wins

For each route, in this order (`GroupScopeAuthorization.cs:70-101`):

| # | On the route | Result |
|---|---|---|
| 1 | `.AllowAnonymous()` | No scope, no token required |
| 2 | `.RequireScope(group, …)` — a named policy | That scope, group declaration ignored |
| 3 | The group declares every method this route serves | The declared scope for each of them |
| 4 | The group declares some but not all of them | Startup refusal — see below |
| 5 | None of the above, in a group that declares nothing | Unchanged: authenticated caller, no scope check |

Row 2 means a *named* policy specifically. `UseEndpointConfigs`' own `RequireAuthorization` option
already stamps blanket, policy-less authorization metadata on every route in every group; that is not
an override, and the declaration still applies over it (`GroupScopeAuthorization.cs:65-69`).

## When the API refuses to start

A group that declares at least one method must cover **every** method each of its routes serves. Leave
one uncovered and the host aborts during startup with an `InvalidOperationException` built here
(`GroupScopeAuthorization.cs:123-125`):

```csharp
throw new InvalidOperationException(
    $"Route '{uncovered.RoutePattern}' serves HTTP {uncovered.Method} with no declared group " +
    "scope, per-route scope, or AllowAnonymous.");
```

Which reads, for the accounts group — declaring `GET`, `POST`, `PUT` and `PATCH` — if it also mapped a
`DELETE {id:guid}`:

```
Route '/v{version:apiVersion}/accounts/{id:guid}' serves HTTP DELETE with no declared group scope, per-route scope, or AllowAnonymous.
```

The check runs once, from `GroupScopeCoverageHostedService.StartedAsync`
(`GroupScopeAuthorization.cs:155-158`), registered in `Program.cs:27` via `AddGroupScopeCoverageCheck()`.
It runs after every route is mapped and inside `IHost.StartAsync`, so the failure is a failed startup,
not a later error on the first request.

**Reading the message.** The route pattern is the raw one, so it still carries the unresolved version
token — `/v{version:apiVersion}/accounts/{id:guid}`, not `/v1/accounts/{id:guid}`. The method is the
first served method the group never declared; if several routes are uncovered, the first one found
stops startup and the rest appear only after you fix it.

A method of `*` means the route was mapped verb-less (`.Map(...)` rather than `.MapGet(...)`), so it
serves every verb and no per-method declaration can cover it (`GroupScopeAuthorization.cs:80-85`).
Give that route its own `.RequireScope(...)` or map it to the verbs it actually serves.

**Fixing it.** Pick the row from the table above that you meant:

- The method belongs to the group's permission model → add it to a `DeclareGroupScope` call at the
  top of the group.
- This one route is priced differently → `.RequireScope(group, ScopeNames.…)` on the route.
- This one route is genuinely public → `.AllowAnonymous()` on the route.

There is no fourth answer. Deleting the group's declarations to silence the check turns the group
back into a non-declaring group and re-opens the gap the check exists to close.

## Groups that declare nothing

A group that never calls `DeclareGroupScope` keeps today's behaviour exactly: its routes keep their
own per-route `RequireScope` declarations, and **the startup check does not look at it at all**. It
is not deprecated, and adding a route to it is not an error.

The postings group is that group today — all four of its routes still declare per-route, because
`postings.write`, `postings.read` and `postings.reverse` do not line up one-per-HTTP-method
(`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Postings/PostingsV1Endpoint.cs:27,43,50,69`: two
different scopes on `POST` alone). So is the single-route currencies group
(`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Currencies/CurrenciesV1Endpoint.cs:21`).

Each group closes its own gap when it adopts the declaration; nothing forces a group to adopt.

## With authorization switched off

The whole mechanism is inert when the host wires no authorization — in this service, exactly when
`FeatureManagement:RequireAuthorization` is `false`, which is the case in `Development` and `Testing`
(see [API Request Pipeline](api-pipeline.md#authentication--authorization)).

`DeclareGroupScope` then records nothing and registers no convention
(`GroupScopeAuthorization.cs:40-46`), so the coverage check sees no declaring groups and every route
answers without a token. An uncovered method in a declaring group therefore **cannot** fail startup
locally or under the test fixtures — it fails in a deployed host, where the flag is on. Run with
`FeatureManagement__RequireAuthorization=true` if you want to see the refusal before you push.

## Gotchas and limits

- **Declare before you map.** `DeclareGroupScope` registers its `Finally` convention on the first
  call; call it after the routes are mapped and it still applies (conventions run at build time), but
  the group no longer reads as its own permission model, which is the point of the feature.
- **Method strings, not constants.** The methods are plain strings (`"GET"`, `"PUT"`). They are
  matched case-insensitively (`GroupScopeAuthorization.cs:50`), but a typo like `"GTE"` is not an
  error — it simply covers nothing, and the startup check reports the real method as uncovered.
- **One scope per method per group.** A second declaration for the same method replaces the first
  (`GroupScopeAuthorization.cs:55-58`); there is no way to require two scopes on one method.
- **The check is per route, not per group name.** Two groups mapped under the same prefix are two
  independent declaration sets.
- **A multi-method route needs every one of its methods declared.** `MapMethods(["GET", "POST"])` is
  covered only when the group declares both (`GroupScopeAuthorization.cs:90`), and the route then
  requires both scopes, not either one (`GroupScopeAuthorization.cs:99-101`). Declaring only `GET`
  refuses startup on `POST`.

## Related pages

- [API Request Pipeline](api-pipeline.md) — where authentication and authorization sit in the request
  sequence, and what `FeatureManagement:RequireAuthorization` switches.
- [Extension Points](extension-points.md) — how `HasScopeRequirement`/`HasScopeHandler` evaluate a
  scope, and where to attach your own authorization rule.
