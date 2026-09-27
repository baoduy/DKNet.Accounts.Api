# Generic List Endpoint (filter · search · order · page)

The two routes in this service that use this contract are `GET /v1/account-groups` and
`GET /v1/accounts`, mapped in
`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/AccountGroups/AccountGroupsV1Endpoint.cs` and
`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs`. For their concrete
query surface — the fields you may filter and order by, the defaults this service sets, and the one
field that is *not* queryable — read
[the README's API contract](../README.md#listing-groups-and-accounts) instead. Everything below is
the underlying package contract both of them inherit.

## Where it comes from

The route is `MapGetList<TEntity, TKey, TModel>()`, part of the **`DKNet.AspCore.Extensions`** NuGet
package. You never call it directly in this service. The `DKNet.SlimBus.Generators` source generator
emits the call for you inside the generated `Map<Entity>Crud()` extension whenever an entity carries
`[CrudCreate]`/`[CrudUpdate]`.

Worked instance — account groups:

```csharp
// ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/AccountGroups/AccountGroupsV1Endpoint.cs
public void Map(RouteGroupBuilder group)
{
    group.MapAccountGroupCrud(...);   // generated → group.MapGetList<AccountGroup, Guid, AccountGroupDto>()
}
```

So `GET /v1/account-groups` is a fully capable list endpoint even though no list handler, validator,
or query object was hand-written for it.

Signature (from the package):

```csharp
public RouteHandlerBuilder MapGetList<TEntity, TKey, TModel>(string endpoint = "/")
    where TEntity : class, IEntity<TKey>
    where TKey    : IEquatable<TKey>
    where TModel  : class;

// Guid-key shorthand
public RouteHandlerBuilder MapGetList<TEntity, TModel>(string endpoint = "/")
    where TEntity : class, IEntity<Guid>
    where TModel  : class;
```

`TModel` is the projected DTO (`AccountGroupDto`/`AccountDto` in this service). It is central to the
whole contract: **you can only filter, search, and order by fields that exist on the DTO**, never on
the raw entity. See [The DTO is the boundary](#the-dto-is-the-boundary) below.

## Query parameters

| Parameter    | Type          | Default | Notes                                                              |
|--------------|---------------|---------|--------------------------------------------------------------------|
| `pageNumber` | `int`         | `1`     | 1-based. A value `< 1` is silently clamped to `1`.                 |
| `pageSize`   | `int`         | `1000`  | A value `< 1` falls back to `1000`. Max **1000** — larger is clamped down, not rejected. Both figures are host-configurable — see [Configuring the defaults](#configuring-the-defaults). |
| `filter`     | repeatable    | none    | `field:operation:value`. Repeat the param to AND multiple conditions. Max **20**. |
| `search`     | `string`      | none    | Free-text OR across all string DTO fields. Min **2** characters.   |
| `orderBy`    | `string`      | none    | A single DTO field name to sort by.                                |
| `desc`       | `bool`        | `false` | Reverses the `orderBy` direction.                                  |
| `fromDate`   | ISO-8601      | none    | Inclusive lower bound on when a record was last active — see [Recent-activity window](#recent-activity-window-fromdate--todate). |
| `toDate`     | ISO-8601      | none    | Inclusive upper bound on when a record was last active. Omitting both bounds does **not** mean "all history" by default — see the same section, and this service's own override below. |

Paging is always applied. Filter, search, and order are each optional and independent; when present
they are ANDed together (search is one OR-group, then ANDed with the filter predicate). Over records
that carry audit timestamps a recent-activity window is also always applied — the `fromDate`/`toDate`
you named, or a default one if you named neither — and it is ANDed with everything else.

## Filtering

Each `filter` value is a colon-delimited triple parsed into a `ListFilter(Field, Operation, Value)`.
Repeat the parameter to combine conditions with **AND**:

```
GET /v1/accounts?filter=Classification:Equal:Asset&filter=Status:Equal:Active
```

### Operations

| Operation            | Value form          | Meaning                                          |
|----------------------|---------------------|--------------------------------------------------|
| `Equal`              | scalar              | `field == value`                                 |
| `NotEqual`           | scalar              | `field != value`                                 |
| `GreaterThan`        | scalar              | `field > value`                                  |
| `GreaterThanOrEqual` | scalar              | `field >= value`                                 |
| `LessThan`           | scalar              | `field < value`                                  |
| `LessThanOrEqual`    | scalar              | `field <= value`                                 |
| `Contains`           | string              | `field.Contains(value)`                          |
| `NotContains`        | string              | `!field.Contains(value)`                         |
| `StartsWith`         | string              | `field.StartsWith(value)`                        |
| `EndsWith`           | string              | `field.EndsWith(value)`                          |
| `In`                 | comma-separated     | `value.Contains(field)` — any of the listed values |
| `NotIn`              | comma-separated     | none of the listed values                        |
| `IsNull`             | *(omit value)*      | `field == null` — two-part form `field:IsNull`   |
| `IsNotNull`          | *(omit value)*      | `field != null` — two-part form `field:IsNotNull`|

- **`In` / `NotIn`** take a comma-separated list; each element is coerced to the property's CLR type.
  Example: `filter=Status:In:Active,Dormant`.
- **`IsNull` / `IsNotNull`** use the two-segment form with no value: `filter=ClosedOn:IsNull`.
- The scalar `Value` is coerced to the DTO property's CLR type (int, decimal, bool, Guid, DateTime, …).
  A value that cannot be coerced is a `400`, not a silent no-op.

### Field naming

`Field` is normalised to PascalCase, so `group_id`, `group-id`, and `GroupId` all resolve to
the same DTO property, matched case-insensitively. The resolved name **must** be a public property
on `TModel`. If it is not, the request fails with `400 Bad Request` — unknown fields are never
silently dropped, because dropping a condition would answer a filtered query with unfiltered data.

Only the **first two** colons split the triple, so a value may contain colons of its own — an
ISO-8601 timestamp being the case that matters:
`filter=CreatedOn:GreaterThan:2026-01-31T00:00:00Z`.

### Limits

- At most **20** filter conditions per request. A 21st is a `400`.

## Ordering

`orderBy` names one DTO field (PascalCased, same rules as filter fields; it must exist on both the DTO
and the entity). `desc=true` sorts descending; omitted or `false` sorts ascending.

```
GET /v1/accounts?orderBy=Balance&desc=true
```

- The unique `Id` is appended as a **descending tie-breaker** so paging is deterministic — unless you
  already ordered by `Id`.
- **Default order (no `orderBy` given):**
  - Audited entities (`IAuditedEntity<TKey>`, which every `AggregateRoot` in this service is) →
    `CreatedOn` descending, then `Id` descending. Newest first.
  - Non-audited entities → `Id` descending only.
- An unknown `orderBy` field is a `400`, not a silent fallback to the default.

## Search

`search` is a single free-text term matched with `Contains` across **every string property of the
DTO**, OR'd together, then ANDed with any `filter`/default predicate:

```
GET /v1/account-groups?search=acme
```

- **Which fields:** the text properties of `TModel`. As with `filter` and `orderBy`, the DTO is the
  boundary — a column it does not expose is never searched.
- **How deep:** up to 2 levels of properties (`MaxDepth = 2` in `ModelSearch`), so a top-level string
  field and one level of a nested object's string field are searched, but no deeper. A collection
  member is wrapped in `Any(...)`; dictionaries and `byte[]` are never descended into or searched —
  which is why an account group's `metadata` map is never matched by `search`.
- **Operator:** substring (`LIKE '%…%'`), not prefix match. Each clause is emitted as
  `Field != null && Field.Contains(term)` — the null guard matters for a provider that evaluates in
  memory.
- **Minimum length:** 2 characters after trimming. A 1-character `search` is a `400`. Blank or
  omitted is treated as absent.
- **Case sensitivity** follows the database collation — no lowercasing is applied in the predicate.
- If the DTO has no text field, `search` matches nothing (an empty page, not an error).

For `AccountGroupDto` the string fields include `Code`, `Name`, `Description` and `OwnerId`, so a
search hits any of those. (Every searched field must map to a real column — see
[the trap below](#trap-a-dto-field-must-map-to-a-real-column).)

## Recent-activity window (`fromDate` / `toDate`)

`fromDate` and `toDate` are inclusive ISO-8601 bounds on when a record was **last active**. A record is
in range when *either* the moment it was created *or* the moment it was last updated falls inside the
bounds — so a record never updated since creation is matched on its creation moment alone, and is never
dropped for lacking an update.

```
GET /v1/accounts?fromDate=2026-06-01T00:00:00Z&toDate=2026-06-30T23:59:59Z
```

- **Records with no audit timestamps:** the bounds have no meaning and are **ignored, not refused** — a
  listing over a non-audited entity answers the same with or without them.
- **Neither bound given, over audited records:** the package's own default is the **last three months
  of activity**, not all history — *unless the host switches the default window off, which this
  service does*; see [Configuring the defaults](#configuring-the-defaults).
- **Either bound given:** exactly the bounds you named, open-ended on the side you left out. Your bounds
  **replace** the default window rather than being narrowed by it — which makes
  `?fromDate=0001-01-01T00:00:00Z` the documented way to ask for **all history**.
- **`fromDate` later than `toDate`** is a `400`. An impossible window is a caller mistake, not an empty
  page; it is the one date-bound error.
- The window narrows which records are in the result **and the reported `TotalItemCount` to match**, it
  combines with `filter`/`search` by **AND**, and it does **not** affect ordering.

## Configuring the defaults

The page size and the window length are host settings on `ListQueryOptions`, bound from the
`DKNet:ListQuery` configuration section:

| Option | Config key | Type | Default | Notes |
|---|---|---|---|---|
| `DefaultPageSize` | `DKNet:ListQuery:DefaultPageSize` | `int` | `1000` | Used when `pageSize` is omitted or `< 1`. |
| `MaxPageSize` | `DKNet:ListQuery:MaxPageSize` | `int` | `1000` | Ceiling an explicit `pageSize` is clamped to. It also caps the default, so an unspecified request is served the lower of the two. |
| `DefaultActivityWindowMonths` | `DKNet:ListQuery:DefaultActivityWindowMonths` | `int` | `3` | Length of the default activity window. Minimum `0`; `0` switches the default window off and leaves a bare listing unbounded in time. |

A service that configures its own values keeps them — the figures above are only the built-in fallbacks
used when a service configures nothing.

**This service configures one of them.**
`ApiEndpoints/DKNet.Accounts.AppServices/AppSetup.cs:64` sets `DefaultActivityWindowMonths = 0`, so the
default activity window described above is **off** on `GET /v1/account-groups` and `GET /v1/accounts`: a
bare listing here returns the caller's full history, not the last three months. A ledger that quietly
withheld older records would answer a question it was not asked. `DefaultPageSize` and `MaxPageSize` are
left at the package defaults of 1000.

## Response envelope

The route returns `200 OK` with a `PagedResponse<TModel>`:

```csharp
public sealed record PagedResponse<TResult>
{
    public IList<TResult> Items { get; init; } = [];
    public int  PageCount       { get; init; }
    public int  PageNumber      { get; init; }
    public int  PageSize        { get; init; }
    public int  TotalItemCount  { get; init; }
    public bool HasNextPage     { get; init; }
    public bool HasPreviousPage { get; init; }
}
```

`Items` holds the projected DTOs for the current page; the rest is paging metadata. It is built from
`X.PagedList` via the repository's `ToPagedListAsync(...)`, so `TotalItemCount` is the full unpaged
count.

## Error behavior

Every malformed input is a **`400 Bad Request`** with a reason (via `Results.Problem`), never a
silently-ignored parameter:

- filter/order field not on the DTO,
- unparseable filter triple or unknown operation,
- a value that cannot be coerced to the property type,
- more than 20 filter conditions,
- a `search` shorter than 2 characters,
- a `fromDate` later than the `toDate` — an impossible activity window.

Out-of-range **paging** is the one exception: `pageNumber < 1` and `pageSize` outside `1..1000` are
clamped, not rejected. The ceiling is `MaxPageSize` — see
[Configuring the defaults](#configuring-the-defaults).

## The DTO is the boundary

Filter, search, and order fields are resolved against `TModel` (the returned DTO), **never the raw
entity**. This is a deliberate security boundary: a column the DTO doesn't expose cannot be sorted on,
filtered on, or searched — no hidden column leaks through the query surface. Widen or narrow the query
surface by changing what the DTO exposes (`[GenerateDto(... Exclude/Include ...)]`), not the endpoint.

`AccountDto` is generated as:

```csharp
[GenerateDto(typeof(Account), Exclude =
    [nameof(Account.CurrencyCode), nameof(Account.AvailableBalance), nameof(Account.OpenedOn),
     nameof(AuditedEntity<Guid>.CreatedBy), nameof(AuditedEntity<Guid>.CreatedOn),
     nameof(AuditedEntity<Guid>.UpdatedBy), nameof(AuditedEntity<Guid>.UpdatedOn)])]
public sealed partial record AccountDto;
```

`CurrencyCode`, `AvailableBalance` and `OpenedOn` are excluded from the generated shape and then
re-declared by hand on the DTO for exactly the reasons in
[the trap below](#trap-a-dto-field-must-map-to-a-real-column) — see
[the README's note on `CurrencyCode` vs `Currency`](../README.md#listing-groups-and-accounts) for the
full story of why one of the three is queryable and the other two are not.

### Trap: a DTO field must map to a real column

Because filter/search/order build EF predicates against the entity **by property name**, every
queryable DTO field has to resolve to a *mapped* entity column. A DTO property whose entity counterpart
is computed or unmapped (`builder.Ignore(...)`) makes the whole query fail to translate — a **500**,
not a `400`, and it fires the moment such a field is touched (search touches *every* string field, so
it breaks on the first search).

This is exactly why `Account.AvailableBalance` and `Account.OpenedOn` are excluded above: on `Account`
they are expression-bodied computed properties (`AvailableBalance => Balance`, `OpenedOn => CreatedOn`)
and are `builder.Ignore(...)`-ed in `AccountConfigs.cs` — not columns. `[GenerateDto]` would otherwise
surface them and every `?search=` on accounts would `500`. **When you point `[GenerateDto]` at an
entity with computed or unmapped members, `Exclude` them** or the free list route inherits a latent
500.

## Worked example

```
GET /v1/accounts
  ?search=acme
  &filter=Classification:Equal:Asset
  &filter=Status:Equal:Active
  &orderBy=Balance
  &desc=true
  &fromDate=2026-06-01T00:00:00Z
  &pageNumber=2
  &pageSize=50
```

Reads as: accounts whose searchable text fields contain "acme", classified as `Asset`, currently
`Active`, last active on or after 1 June 2026 (with no upper bound, because `toDate` was omitted),
sorted by balance descending (with `Id` as tie-break), returning the second page of 50.

Because this service turns the default activity window off, dropping the `fromDate` line here still
returns every account regardless of age — unlike a service running the package's own three-month
default.
