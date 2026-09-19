# AGENTS.md

## Scope
- This repository template is centered on `src/ApiEndpoints` and the solution `src/DKNet.Templates.sln`.
- Prefer code-verified patterns in this guide over older README statements when they differ.

## Architecture at a glance
- API startup is in `src/ApiEndpoints/DKNet.Accounts.Api/Program.cs`: bind `FeatureOptions`, then `AddLogConfig` -> `AddAzureAppConfig` -> `AddFluentValidationConfig` -> `RunMigrationAsync` -> `AddAppConfig` -> `AddContextualRequestPopulation` -> `UseAppConfig(a => a.UseEndpointConfigs(...))`.
- Middleware/service composition is orchestrated by `DKNet.Accounts.Api/Configs/AppConfig.cs` and `DKNet.Accounts.Api/Configs/ServiceConfigs.cs`.
- Layer boundaries are strict: `Api` -> `AppServices` -> `Domains`, with infra wiring from `DKNet.Accounts.Infra/Extensions/InfraSetup.cs`.
- **Domain and DTO sharing**:
  - An enum, a value-object record (`public sealed record`) or an owned type is declared once in `Domains` and referenced by `using` from the DTO — never re-declared as an identical copy.
  - Entities are the one exception and stay off DTOs entirely (`AppServiceTests.DtosWithGenerateDtoAttribute_ShouldNotHaveProperties_ThatAreDomainEntities`).
  - A DTO declaring its own copy of a Domain enum is the DRK-1247 B1 defect (Mapster's default cross-type enum conversion emits a numeric cast that a `HasConversion<string>()` column rejects) — do not reintroduce it.
  - A DTO property that renames a Domain member (e.g. `CurrencyCode` -> `Currency`) still needs an explicit `TypeAdapterConfig` `.Map(...)` in `AppSetup.cs`, because Mapster's `ProjectToType` drops an unmatched member silently instead of erroring.
- `DKNet.Accounts.AppHost/AppHost.cs` is Aspire host orchestration (Redis + PostgreSQL + API project), not business logic.
- Persistence uses EF Core with auto model config and seeding (`UseAutoConfigModel`, `UseAutoDataSeeding`) in `InfraSetup.AddInfraServices` **and** in `InfraMigration.MigrateDb` — both context-construction paths must wire seeding, or seed data never appears over HTTP depending on which startup path runs.

## Two worked feature patterns — pick one before copying
The template carries two side-by-side vertical slices demonstrating opposite ends of "hand-write it" vs "declare it and let the generator produce it". Read [`docs/samples/manual-vs-automated.md`](docs/samples/manual-vs-automated.md) before copying either — it states, layer by layer, what each writes and what the generated path gives up (most sharply: forwarded DataAnnotations validation on the automated sample is never evaluated under this template's own endpoint-registration convention).

- **Manual — `PurchaseOrder`** (`*/ManualSample/`): every layer hand-written — entity, event (`AddEvent` in the constructor), FluentValidation-backed create/update requests, business-rule rejection (`Cancel` on an already-cancelled order), filtered/paged list, request idempotency (`.RequiredIdempotentKey()`), static seed data. Endpoint: `DKNet.Accounts.Api/ApiEndpoints/ManualSample/PurchaseOrderV1Endpoint.cs`.
- **Automated — `Product`** (`*/AutomatedSample/`): entity declares `[RaisesEvent(...)]` for its events, `[CrudCreate]`/`[CrudUpdate]` for its write operations, and a one-line `[GenerateDto(typeof(Product))]` DTO; `DKNet.SlimBus.Generators` produces the request/handler/route types (`CreateProductRequest`, `ChangePriceProductRequest`, their handlers, and `ProductCrudEndpointExtensions.MapProductCrud()`). Carries external Azure Service Bus publish/subscribe instead of idempotency/seeding. Endpoint: `DKNet.Accounts.Api/ApiEndpoints/AutomatedSample/ProductV1Endpoint.cs`.

## Feature vertical slice pattern (copy this)
- Endpoint contract: implement `IEndpointConfig` (from `DKNet.AspCore.Extensions`) in `DKNet.Accounts.Api/ApiEndpoints/**/*V1Endpoint.cs`.
- Hand-mapped routes use the raw dknet.accounts-API surface (`group.MapPost(...)`, etc. — see `PurchaseOrderV1Endpoint`) or the package's generic entity helpers `MapGetList<TEntity,TKey,TDto>`/`MapGetById`/`MapPost<TRequest,TDto>`/`MapPutById`/`MapDeleteById` (see the generated `ProductCrudEndpointExtensions`).
- Manual write workflow example (`CreatePurchaseOrderRequest`): FluentValidation validator -> handler constructs the aggregate (which raises its own event via `AddEvent`) -> `repository.AddAsync` -> `mapper.ResultOf<TDto>(entity)`.
- Automated write workflow example (`Product`): `[CrudCreate]` constructor parameters become the generated request's properties 1:1; the generated handler calls `new Product(request.Name, request.Price)` and `repository.AddAsync` — no hand-written request, validator, or handler exists for it.
- Domain entity lives in `DKNet.Accounts.Domains/Features/<Feature>/Entities` and keeps mutation in methods (`ChangeAmount(...)`, `Cancel(...)`, `ChangePrice(...)`).
- EF mapping lives in `DKNet.Accounts.Infra/Features/<Feature>/Mappers` (`PurchaseOrderConfigs`, `ProductConfigs`) and enforces indexes/length/schema — hand-written for both samples; no generator produces `IEntityTypeConfiguration<T>`.

## Message bus and events
- `AddServiceBus` in `DKNet.Accounts.Infra/Extensions/ServiceBusSetup.cs` always wires an in-memory child bus (`ImMemory`) for internal handlers.
- Azure Service Bus child bus (`AzureBus`) is added only when `ConnectionStrings:AzureBus` is non-empty; `Product`'s `Produce<ProductCreatedEvent>`/`Consume<ProductCreatedEvent>` wiring lives there.
- Domain events are published through `DKNet.Accounts.Infra/Services/EventPublisher.cs` using `IMessageBus.Publish(...)`.
- Hand-raised example: `PurchaseOrderCreatedEvent`, raised by `AddEvent(...)` in `PurchaseOrder`'s constructor, consumed by `PurchaseOrderCreatedEventHandler`.
- Declared example: `[RaisesEvent(EventOperations.Created, Include = [...])]` / `[RaisesEvent(EventOperations.Updated, nameof(Price))]` on `Product` compose `ProductCreatedEvent`/`ProductPriceUpdatedEvent` at compile time — no `AddEvent` call anywhere in `AutomatedSample/`. Raised by DKNet's EF Core save hook, not by application code.

## Commands, mapping, and user context
- The acting user is populated onto `[FromClaim(ClaimTypes.Name)]`-decorated request properties by `AddContextualRequestPopulation` (wired in `Program.cs`), which falls back to `SharedConsts.SystemAccount` only when `RequireAuthorization` is off.
- A generated CRUD request (`CreateProductRequest`, `ChangePriceProductRequest`) can **never** carry an acting-user field — the generator forwards only `System.ComponentModel.DataAnnotations` attributes, not `[FromClaim]` (namespace `DKNet.AspCore.Extensions.ModelBinding`). `CreatedBy`/`CreatedOn` are instead stamped by `DKNet.EfCore.AuditLogs`' audit hook from `ICurrentUserProvider.GetCurrentUser()`, wired once in `DKNet.Accounts.Api/Configs/ServiceConfigs.cs` (`AddCurrentUserProvider<CoreDbContext, PrincipalProvider>()`) — it only fills in a blank `CreatedBy`, so the manual sample's constructor-set value (via `AggregateRoot(byUser)`) is left untouched.
- Mapster is global in `DKNet.Accounts.AppServices/AppSetup.cs`; DTO generation uses `[GenerateDto(...)]` (example: `ProductDto`, one line, generates every audited property). The manual sample's `PurchaseOrderDto` is hand-written instead, exposing only the 5 fields it chooses.
- Lazy mapping result helpers are `DKNet.SlimBus.Extensions.LazyMapper`'s `ResultOf<T>`/`LazyMap<T>` (the template's former local copy under `AppServices/Extensions/LazyMapper` was removed — both samples use the package's version now).

## Build, run, and migration workflow
- SDK/framework are pinned centrally (`src/global.json`, `src/Directory.Packages.props`) and target `net10.0`.
- Core commands:
  - `dotnet restore src/DKNet.Templates.sln`
  - `dotnet build src/DKNet.Templates.sln -c Release`
  - `dotnet test src/DKNet.Templates.sln --settings src/coverage.runsettings --collect:"XPlat Code Coverage"`
- Local host options:
  - API only: `dotnet run --project src/ApiEndpoints/DKNet.Accounts.Api`
  - Aspire host: `dotnet run --project src/ApiEndpoints/DKNet.Accounts.AppHost`
- EF migrations scripts from `src/ApiEndpoints`: `./add-migration.sh <Name>` and `./remove-migration.sh <Name>`.

## Testing and quality constraints
- Tests currently live mainly under `src/ApiEndpoints/DKNet.Accounts.App.Tests/` (Shouldly + xUnit patterns) and `src/ApiEndpoints/DKNet.Accounts.App.BDDTests/` (Reqnroll + NUnit).
- `DKNet.Accounts.App.Tests.csproj` disables analyzers for tests; production projects enforce strict warnings-as-errors from `Directory.Packages.props`.
- Coverage filters are defined in `src/coverage.runsettings`; avoid placing real logic in excluded paths (`bin/`, `obj/`, `*Test*.cs`).

## BDD Testing (Reqnroll + NUnit)
- BDD tests live in `src/ApiEndpoints/DKNet.Accounts.App.BDDTests/`.
- `Support/BddApiFactory.cs` boots `WebApplicationFactory<Program>` once per test run using Reqnroll `[BeforeTestRun]` hook in `ApiHooks.cs`.
- In-memory EF Core + disabled migrations/AzureAppConfig — no external services required.
- Each scenario resets the DB in `[BeforeScenario(Order=0)]`; `HttpClient` and `ScenarioState` are injected into step defs via Reqnroll's BoDi `IObjectContainer`.
- Add new scenarios: create `.feature` under `Features/<Domain>/` and matching `[Binding]` step class under `Features/<Domain>/Steps/`.
- POST endpoints that opt into idempotency (the manual sample) require `X-Idempotency-Key: {Guid}` header — generate `Guid.NewGuid()` per request in `[When]` steps. The automated sample's generated create route has no such requirement.

## Project-specific gotchas
- `FeatureOptions` section name is `FeatureManagement`, and its JSON keys match the `FeatureOptions` property names one-for-one. `Get<FeatureOptions>()` ignores unknown keys, so a misspelled key silently falls back to the property default rather than throwing — when adding or renaming a flag, change `DKNet.Accounts.Share/Options/FeatureOptions.cs` and every `appsettings*.json` together. Flag table with shipped values: `docs/template-features.md`.
- Prefer adding new feature slices by mirroring `ManualSample/PurchaseOrder` (hand-written) or `AutomatedSample/Product` (generator-driven) across Domains -> Infra -> AppServices -> Api, per `docs/samples/manual-vs-automated.md`.
- When adding repos/services in Infra, keep classes `sealed` and under `.Repos` or `.Services` namespaces so Scrutor scanning picks them up.
- A generated CRUD request's DataAnnotations rules (e.g. `[Range]` on `Price`) are **not enforced** when the entity is mapped through the generated `MapProductCrud()`-style route, because .NET 10's automatic validation source generator can't see through `DKNet.AspCore.Extensions`'s generic `Map*<TRequest,TDto>` wrapper. Don't assume a `[Range]`/`[Required]` on a `[CrudCreate]` parameter is enforced without checking whether the entity's endpoint is hand-mapped (enforced) or generator-mapped (not enforced) — see the "Request validation" row in `docs/samples/manual-vs-automated.md`.

## Mutation testing (Stryker)
- `dotnet-stryker` is pinned as a local tool in `.config/dotnet-tools.json` (5.0.0 — the newest version on nuget.org; it has no net10.0-native release, but it runs fine against this SDK). Config lives at `ApiEndpoints/DKNet.Accounts.App.Tests/stryker-config.json` and targets `DKNet.Accounts.Api.csproj` mutated against `DKNet.Accounts.App.Tests.csproj` (the Api project is the smallest of the Tests project's four `ProjectReference`s that Stryker can resolve by name — running from the solution root or naming a project the Tests project doesn't directly reference yields "Scanning 0 possible targets").
- Run:
  ```
  dotnet tool restore
  cd ApiEndpoints/DKNet.Accounts.App.Tests
  dotnet stryker
  ```
- If `dotnet stryker`/`dotnet-stryker` fails with `You must install .NET to run this application` (its native apphost doesn't inherit the `dotnet` launcher's `DOTNET_ROOT`), export it first from the runtime `dotnet` itself already resolves:
  ```
  export DOTNET_ROOT="$(dotnet --list-runtimes | awk '/Microsoft.NETCore.App/ {print $3}' | tr -d '[]' | sed 's|/shared/Microsoft.NETCore.App||')"
  ```
- Reads the mutation score from the console (`The final mutation score is NN.NN %`) and the HTML report at `ApiEndpoints/DKNet.Accounts.App.Tests/StrykerOutput/<timestamp>/reports/mutation-report.html`. Baseline on `DKNet.Accounts.Api`: **79.51%** (97 killed / 8 survived / 105 tested, 533 skipped as no-coverage/excluded/compile-error). `stryker-config.json` sets `thresholds.break: 0` (non-blocking) since that baseline sits just under the default `high: 80` — the owner ratifies the Build-gate break value.

## Reference docs (link-first)
- Comparison + worked samples: `docs/samples/manual-vs-automated.md`, `docs/samples/manual-purchase-orders/README.md`, `docs/samples/automated-products/README.md`
- Skill catalog for guided implementation: `.github/skills/README.md`
