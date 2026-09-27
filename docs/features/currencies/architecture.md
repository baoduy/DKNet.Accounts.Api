# Currencies — Architecture

> Diagrams below are Mermaid, pending an archify render — no diagram is skipped.

## Vertical Slice Overview

The whole slice, Create through Deactivate, is one generated composite route
(`group.MapCurrencyCrud(o => o.Exclude(CrudOp.Delete))`,
`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Currencies/CurrenciesV1Endpoint.cs`) except for one
hand-written handler that replaces the generated one for Deactivate.

```mermaid
graph TD
    Client["Client"]

    subgraph API["DKNet.Accounts.Api"]
        EP["CurrenciesV1Endpoint\nMapCurrencyCrud(Exclude(Delete))"]
    end

    subgraph AppServices["DKNet.Accounts.AppServices"]
        VAL["Create/RenameCurrencyRequestValidator\n(FluentValidation)"]
        HDL["Generated handlers\n(Create, Rename, Activate)"]
        DEACT["DeactivateCurrencyHandler\n(hand-written, replaces generated)"]
        SPEC["SpecGetCurrency"]
    end

    subgraph Domains["DKNet.Accounts.Domains"]
        ENT["Currency (AggregateRoot)\nRename / Activate / Deactivate"]
    end

    subgraph Infra["DKNet.Accounts.Infra"]
        MAP["CurrencyConfigs.cs\n(EF Core config)"]
        REPO["IRepositorySpec"]
    end

    DB[("PostgreSQL — pro.Currencies")]

    Client -->|HTTP| EP -->|IMessageBus.Send| VAL --> HDL --> ENT
    EP -->|Deactivate| DEACT
    DEACT -->|SpecListAccounts, cross-aggregate check| REPO
    HDL --> REPO
    DEACT --> ENT
    SPEC --> REPO
    REPO --> MAP --> DB
```

## Create Currency — Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant EP as CurrenciesV1Endpoint
    participant BUS as IMessageBus
    participant VAL as CreateCurrencyCommandValidator
    participant SPEC as SpecGetCurrency
    participant REPO as IRepositorySpec
    participant HDL as generated Create handler

    C->>EP: POST /v1/currencies
    EP->>BUS: bus.Send(CreateCurrencyRequest)
    BUS->>VAL: Validate(request)
    VAL->>SPEC: SpecGetCurrency(byCode)
    VAL->>REPO: AnyAsync(spec)
    REPO-->>VAL: false (code free)
    VAL-->>BUS: Valid
    BUS->>HDL: Handle(request)
    HDL->>HDL: new Currency(code, name, decimalPlaces)
    HDL->>REPO: AddAsync(entity) + SaveChangesAsync()
    REPO-->>HDL: OK
    HDL-->>EP: CurrencyDto
    EP-->>C: 201 Created + CurrencyDto
```

`CreatedBy`/`UpdatedBy` are not shown: no request in this slice carries an acting-user field, and the
audit hook stamps them from the caller's credential on `SaveChanges`, never from the handler.

## Status State Machine

`IsActive` is a plain boolean, not an enum, but it does gate behaviour: `Activate()`/`Deactivate()`
are the only two writers, both `[CrudAction]` routes.

```mermaid
stateDiagram-v2
    [*] --> Active : Create (IsActive = true, always)
    Active --> Inactive : POST /{id}/deactivate\n(refused with CURRENCY_HOLDS_BALANCE if an\naccount in this currency still holds a balance)
    Inactive --> Active : POST /{id}/activate (unconditional)
```

`Deactivate()` on the entity itself carries no guard — the `CURRENCY_HOLDS_BALANCE` check runs in
`DeactivateCurrencyHandler` before the entity method is called, because it queries a different
aggregate (`Account`) than the one being mutated.

## Layer Responsibilities

| Layer | Responsibility in this feature |
|-------|-------------------------------|
| `DKNet.Accounts.Api` | One composite route registration; no business logic |
| `DKNet.Accounts.AppServices` | Validators (code uniqueness, decimal-places range 0–6); the one hand-written handler (Deactivate) |
| `DKNet.Accounts.Domains` | `Currency` entity: `Rename`, `Activate`, `Deactivate` |
| `DKNet.Accounts.Infra` | `CurrencyConfigs` EF mapping; seed data for the 26 shipped currencies |
