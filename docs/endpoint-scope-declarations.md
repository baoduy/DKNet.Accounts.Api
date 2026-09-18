# Endpoint Scope Declarations

How an endpoint group declares, once per HTTP method, the scope every route in it requires — and what
happens when a declaring group leaves a method uncovered.

Read this before you add a route to an endpoint group, and before you add a group of your own.

The mechanism is `EndpointGroupScopeAttribute`, published by `DKNet.AspCore.Extensions`. The scope names
it takes are the constants in `DKNet.Accounts.Api/Configs/Auth/SampleAuthorizationRequirement.cs`
(`ScopeNames`), each of which is also a registered authorization policy name
(`DKNet.Accounts.Api/Configs/Auth/AuthConfig.cs:40-41`).

## Declaring a group's scopes

Put `[EndpointGroupScope(scope, params httpMethods)]` above the `IEndpointConfig` class, once per scope.
Declarations stack — one attribute per scope:

```csharp
// ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs
[EndpointGroupScope(ScopeNames.AccountsRead, EndpointHttpMethods.Get)]
[EndpointGroupScope(ScopeNames.AccountsWrite, EndpointHttpMethods.Post, EndpointHttpMethods.Put, EndpointHttpMethods.Patch)]
internal sealed class AccountsV1Endpoint : IEndpointConfig
```

Those two attributes are the whole permission model for the accounts group: every `GET` it serves requires
`accounts.read`, and every `POST`, `PUT` and `PATCH` requires `accounts.write`. No route below repeats it.
The account-groups endpoint declares the same way, over its own four methods
(`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/AccountGroups/AccountGroupsV1Endpoint.cs`: `accounts.read`
for `GET`, `accounts.write` for `POST`, `PUT` and `DELETE`).

A declaration applies to **every** route the group registers for that method, including routes the CRUD
generator produces — `MapAccountGroupCrud` registers the account group's whole route set, and no route in
it names a scope of its own. `MapAccountCrud` does the same for accounts.

Naming no HTTP method declares the group's default scope for every method it serves; a per-method
declaration on the same group wins over that default.

`EndpointHttpMethods` publishes `Get`, `Post`, `Put`, `Patch`, `Delete`, `Head` and `Options` as `const`
strings — unlike `Microsoft.AspNetCore.Http.HttpMethods`'s `static readonly` fields — specifically so they
can be used as attribute constructor arguments.

## Overriding one route

A route that names its own scope keeps it. Use `RequireScope(group, scope)` on that route, exactly as
every route did before group declarations existed
(`DKNet.Accounts.Api/Configs/Auth/ConditionalScopeAuthorization.cs:21`):

```csharp
// ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs:111
group.MapGet("{id:guid}/statement", async (/* … */) => { /* … */ })
    .RequireScope(group, ScopeNames.PostingsRead)
```

`GET /v1/accounts/{id}/statement` therefore requires `postings.read`, even though the accounts group
declares `accounts.read` for `GET`. It is a read over postings, not over the account record, so it is
priced as one.

An override also satisfies the coverage check for that route — a route with its own scope is covered
whether or not the group declares its method.

## Opening one route to anonymous callers

`.AllowAnonymous()` on the route wins over the group declaration. Nothing else is needed, and the group
keeps its declarations for every other route:

```csharp
// ApiEndpoints/DKNet.Accounts.App.Tests/Integration/Auth/GroupScopeDeclarationAdoptionTests.cs:273-278
[EndpointGroupScope(GroupScopeDeclarationStandaloneTests.TestOnlyScope, EndpointHttpMethods.Get)]
internal sealed class TestOnlyAnonymousRouteEndpointConfig : IEndpointConfig
{
    public int Version => 1;
    public string GroupEndpoint => "/test-only-anonymous-group";
    public void Map(RouteGroupBuilder group) => group.MapGet("/open", () => Results.Ok()).AllowAnonymous();
}
```

`GET /test-only-anonymous-group/open` then answers a request carrying no token at all, while every other
route the group declares still requires its scope.

No shipped ledger route is anonymous. The only anonymous endpoints this service publishes are the public
health probes at `/healthz` and `/`, and they sit outside any endpoint group
(`DKNet.Accounts.Api/Configs/Healthz/HealthzConfig.cs:49-50`).

## Which rule wins

For each route, in this order:

| # | On the route | Result |
|---|---|---|
| 1 | `.AllowAnonymous()` | No scope, no token required |
| 2 | `.RequireScope(group, …)` — a named policy | That scope, group declaration ignored |
| 3 | The group declares every method this route serves | The declared scope for each of them |
| 4 | The group declares some but not all of them | Refused when the group's endpoints are built — see below |
| 5 | None of the above, in a group that declares nothing | Unchanged: authenticated caller, no scope check |

Row 2 means a *named* policy specifically. `UseEndpointConfigs`' own `RequireAuthorization` option already
stamps blanket, policy-less authorization metadata on every route in every group; that is not an override,
and the declaration still applies over it.

## When a group leaves a method uncovered

A group that declares at least one method must cover **every** method each of its routes serves. Leave one
uncovered and the package's own coverage check refuses it — lazily, when the group's endpoints are built;
this API adds nothing to force that check any earlier — with an `InvalidOperationException`:

```
Route '<pattern>' serves HTTP method '<method>' with no scope declared by an EndpointGroupScopeAttribute above its group.
```

Which reads, for the accounts group — declaring `GET`, `POST`, `PUT` and `PATCH` — if it also mapped a
`DELETE {id:guid}`:

```
Route '/v{version:apiVersion}/accounts/{id:guid}' serves HTTP method 'DELETE' with no scope declared by an EndpointGroupScopeAttribute above its group.
```

**Fixing it.** Pick the row from the table above that you meant:

- The method belongs to the group's permission model → add it to an `[EndpointGroupScope(...)]` attribute
  above the group.
- This one route is priced differently → `.RequireScope(group, ScopeNames.…)` on the route.
- This one route is genuinely public → `.AllowAnonymous()` on the route.

There is no fourth answer. Removing the group's attributes to silence the check turns the group back into
a non-declaring group and re-opens the gap the check exists to close.

## Groups that declare nothing

A group with no `[EndpointGroupScope]` attribute above it keeps today's behaviour exactly: its routes keep
their own per-route `RequireScope` declarations, and **the coverage check does not look at it at all**. It
is not deprecated, and adding a route to it is not an error.

The postings group is that group today — all four of its routes still declare per-route, because
`postings.write`, `postings.read` and `postings.reverse` do not line up one-per-HTTP-method
(`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Postings/PostingsV1Endpoint.cs:27,43,50,69`: two different
scopes on `POST` alone). So is the single-route currencies group
(`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Currencies/CurrenciesV1Endpoint.cs:21`).

Each group closes its own gap when it adopts the declaration; nothing forces a group to adopt.

## With authorization switched off

The whole mechanism is inert when the host wires no authorization — in this service, exactly when
`FeatureManagement:RequireAuthorization` is `false`, which is the case in `Development` and `Testing`
(see [API Request Pipeline](api-pipeline.md#authentication--authorization)).

The package turns `[EndpointGroupScope]` into authorization policies only when
`EndpointRegistrationOptions.RequireAuthorization` is `true` — the same flag `UseEndpointConfigs` passes
through from `FeatureManagement:RequireAuthorization`. With it off, the coverage check sees no declaring
groups and every route answers without a token. An uncovered method in a declaring group therefore
**cannot** fail locally or under the test fixtures — it fails in a deployed host, where the flag is on. Run
with `FeatureManagement__RequireAuthorization=true` if you want to see the refusal before you push.

## Gotchas and limits

- **One scope per method per group.** A group's declarations collapse to one scope per HTTP method — naming
  the same method twice on one group leaves it with a single scope, not two.
- **A multi-method route needs every one of its methods declared.** A route mapped to more than one HTTP
  method gets one authorization requirement per distinct scope its served methods require, so it is refused
  if any of them is uncovered, and it then requires every one of those scopes, not just one.

## Related pages

- [API Request Pipeline](api-pipeline.md) — where authentication and authorization sit in the request
  sequence, and what `FeatureManagement:RequireAuthorization` switches.
- [Extension Points](extension-points.md) — how `HasScopeRequirement`/`HasScopeHandler` evaluate a
  scope, and where to attach your own authorization rule.
