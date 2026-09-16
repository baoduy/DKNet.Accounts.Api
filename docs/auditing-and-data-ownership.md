# Auditing and Data Ownership

How `CreatedBy`/`CreatedOn`/`UpdatedBy`/`UpdatedOn` get populated, and why a caller can never forge
them. Full API surface for the two packages behind this: `DKNet.EfCore.Abstractions`
([docs/EfCore/DKNet.EfCore.Abstractions.md](https://github.com/baoduy/DKNet.Accounts.Api/blob/dev/docs/EfCore/DKNet.EfCore.Abstractions.md))
and `DKNet.EfCore.DataAuthorization`
([docs/EfCore/DKNet.EfCore.DataAuthorization.md](https://github.com/baoduy/DKNet.Accounts.Api/blob/dev/docs/EfCore/DKNet.EfCore.DataAuthorization.md)).

## The audit fields

Every aggregate in this template ultimately derives from `AuditedEntity<TKey>`
(`DKNet.EfCore.Abstractions`), which exposes `IAuditedProperties`:

| Field | Meaning |
|---|---|
| `CreatedBy` / `CreatedOn` | Who created the row, and when |
| `UpdatedBy` / `UpdatedOn` | Who last modified the row, and when |

`DKNet.Accounts.Domains/Share/DomainEntity.cs` extends `AuditedEntity<Guid>`.
`DKNet.Accounts.Domains/Share/AggregateRoot.cs` extends `DomainEntity` and is the base every feature
aggregate in this service (`AccountGroup`, `Account`, `Posting`) uses.

Both expose a single constructor shape, and **no aggregate stamps its own `CreatedBy`**:

| Constructor | Who stamps `CreatedBy` |
|---|---|
| `DomainEntity()` / `AggregateRoot()` — parameterless, assigns a fresh id only | `DataOwnerHook`, on save |

There is no constructor overload that accepts an author. The reason started with `[CrudCreate]`: the
generated create request's shape *is* the attributed constructor's parameter list, so a trailing
`createdBy` would become a caller-settable body field. That reason now holds for every aggregate
rather than only the generated ones — `AccountGroup`
(`ApiEndpoints/DKNet.Accounts.Domains/Features/AccountGroups/Entities/AccountGroup.cs:40`), `Account`
and `Posting` are all constructed without an author, and the parameterless base is the only route
they have.

## Who is allowed to set them

**Invariant: audit and ownership values come from the authenticated principal at save time, never
from a request property.** No request in this service — generated or hand-written — carries an
acting-user parameter.

In this service one mechanism does it, and it is the only one: **`DKNet.EfCore.DataAuthorization`'s
`DataOwnerHook`, stamping on `SaveChanges`** from `IDataOwnerProvider.GetOwnershipKey()`. That covers
both `CreatedBy` and `UpdatedBy`, on every aggregate and every write path — hand-written and generated
alike. No constructor or domain method takes an acting user, none calls `SetUpdatedBy`, and no create
or update request in this service carries an acting-user property for a caller to set.

> The template this service was scaffolded from also demonstrates a second shape — `[FromClaim]`
> populating a request property that the aggregate then stamps itself, shown there on the fictional
> `PurchaseOrder` sample. **This service does not use it for audit fields.** The pipeline's
> `[FromClaim]` population is still wired (`DKNet.Accounts.Api/Program.cs:23`), and the same idea
> appears once for a different purpose — `RecordPostingRequest.RecordedBy`
> (`ApiEndpoints/DKNet.Accounts.AppServices/Postings/V1/Actions/Record.cs:43`) — but the value a
> posting is attributed to comes from `ICallingSystemAccessor`, not from the body.

### How the acting identity is resolved

`DKNet.Accounts.Api/Configs/Handlers/PrincipalProvider.cs` implements `IPrincipalProvider` (which
extends `IDataOwnerProvider`, adding `ProfileId`/`Email`/`UserName`). `GetOwnershipKey()` returns, in
order:

1. The caller's **subject claim** — the first non-empty of
   `http://schemas.microsoft.com/identity/claims/objectidentifier`, `oid`, `ClaimTypes.NameIdentifier`,
   `sub` (`PrincipalProvider.cs:76`).
2. Failing that, the caller's **`client_id` claim** (`PrincipalProvider.cs:94`) — the same claim
   `CallingSystemAccessor` reads. This service authenticates machine-to-machine callers, whose
   credentials carry no subject claim at all; without this fallback such a caller's first write would
   be refused by `EnsureOwnershipResolvable` (see [below](#when-the-caller-cannot-be-attributed))
   rather than attributed.
3. For an unauthenticated caller, `SharedConsts.SystemAccount` (`PrincipalProvider.cs:68`).

`ProfileId` on the same class exposes that key parsed as a `Guid`, or `Guid.Empty` when it does not
parse — a convenience for domain code, not what the hook stamps.

`DKNet.Accounts.Api/Configs/ServiceConfigs.cs`: `.AddDataOwnerProvider<CoreDbContext, PrincipalProvider>()`
registers the provider and wires `DataOwnerHook` onto `CoreDbContext`.

**`ICallingSystemAccessor` is deliberately separate.** `CallingSystemAccessor.cs:12` reads `client_id`
and nothing else, and it is what handlers pass into domain methods and record on a posting's
`callingSystem`. The two answer different questions — who acted, versus which machine called — and a
handler that reached for the wrong one would misattribute a ledger entry.

Concretely: the **author** stamped into `CreatedBy`/`UpdatedBy` is the credential's subject whenever the
credential names a person, and falls back to `client_id` only when it names nothing but a calling system
(the two steps above). A posting's **`CallingSystem`** is a separate value, always read from `client_id`.
For a machine-to-machine caller the two coincide; for a person calling through a client application they
differ — the posting records the person as its author and the application as its calling system.
`ApiEndpoints/DKNet.Accounts.App.BDDTests/Features/Ledger/AuthorFromCredential.feature` pins both halves,
in *"A posting by a person records the person and keeps the calling system"* and *"A posting by a system
with no person records the system as the author"*.

### What the hook does on save

1. Stamps `CreatedBy`/ownership on every newly-added entity, from `IDataOwnerProvider.GetOwnershipKey()`.
2. On a modified entity, stamps `UpdatedBy`/`UpdatedOn` from the same ownership key. The hook does
   defer to an explicit in-process `SetUpdatedBy` when it finds one — it compares the property's
   current value against its EF Core `OriginalValue` — but no code in this service takes that route,
   so in practice the hook is what stamps every update.
3. Guards `IOwnedBy.OwnedBy` on a modified entity against reassignment to a key the current context
   doesn't hold, preventing cross-tenant transfer.

Because no create or update payload has an acting-user field — and no constructor or domain method
behind one takes an acting user either — there is nothing for a caller to smuggle in. Three acceptance scenarios in
`ApiEndpoints/DKNet.Accounts.App.BDDTests/Features/Ledger/AttributeCrudMigration.feature` pin this end
to end: *"A new account group records the calling system as its author"*, *"An author named in the
request payload is ignored"* (which sends an `author` field and asserts it is not what is stored), and
*"A rename through the generated route records the acting system as its modifier"*, which asserts
`UpdatedBy` after a `PUT` rename — the case that proves the hook covers the generated update routes and
not just creates.

The `client_id` fallback in step 2 is pinned twice: in isolation by `PrincipalProviderTests`, and end
to end by
`ApiEndpoints/DKNet.Accounts.App.Tests/Integration/Ledger/ClientIdOnlyCallerTests.cs`, which creates a
group as a caller carrying `client_id` and a scope and **no subject claim at all** — the real
machine-to-machine credential shape — and asserts `CreatedBy` comes back as that client id. Remove the
fallback and that create turns into a `403` rather than a `201`, because
`EnsureOwnershipResolvable` refuses a row it cannot attribute.

## Row-level ownership filtering

`DKNet.Accounts.Infra/Contexts/CoreDbContext.cs` implements `IDataOwnerDbContext` directly, exposing
`AccessibleKeys` from the same `IDataOwnerProvider` used for stamping. `DKNet.EfCore.DataAuthorization`
uses this to apply a global query filter on any entity implementing `IOwnedBy`, so a caller only
ever sees rows whose ownership key matches their own. Filtering happens at the query level, not in
application code.

## Where in the save pipeline this runs

`DataOwnerHook` runs as part of EF Core's `SaveChanges`/`SaveChangesAsync` pipeline. It's a
`BeforeSaveAsync` hook, registered via `.AddDataOwnerProvider<CoreDbContext, PrincipalProvider>()`.
It runs after change tracking has determined which entities are added or modified, and before the
`UPDATE`/`INSERT` statements are sent — so the stamped values are always part of the same
transaction as the data change itself.

## When the caller cannot be attributed

`CoreDbContext` overrides every `SaveChanges`/`SaveChangesAsync` entry point with
`EnsureOwnershipResolvable`. Before EF Core writes anything, it checks whether the ownership key is
empty while the change set contains a newly-added `IAuditedProperties` entity whose `CreatedBy`
column is non-nullable and still unset. If so it throws `OwnershipRequiredException` — a fail-closed
refusal rather than a row attributed to nobody.

`DKNet.Accounts.Api/Configs/GlobalExceptions/GlobalExceptionHandler.cs` maps that exception to
`403 Forbidden` with `Title` `"Request refused."`, deliberately separate from the generic `500` path
so no EF Core column or entity name leaks into the response.
