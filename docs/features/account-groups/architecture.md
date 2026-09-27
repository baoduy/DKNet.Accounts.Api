# Account Groups — Architecture

> Diagrams below are Mermaid, pending an archify render — no diagram is skipped.

## Vertical Slice Overview

Create, GetList, GetById, Update, Delete, Activate and Close are one generated composite
(`group.MapAccountGroupCrud(...)`). Balances and status-counts are hand-mapped reads beside it.

```mermaid
graph TD
    Client["Client"]

    subgraph API["DKNet.Accounts.Api"]
        EP["AccountGroupsV1Endpoint\nMapAccountGroupCrud(...)"]
        BAL["GET {id}/balances (hand-mapped)"]
        SC["GET status-counts (hand-mapped)"]
    end

    subgraph AppServices["DKNet.Accounts.AppServices"]
        VAL["Create/Update/DeleteAccountGroup\nvalidators (FluentValidation)"]
        HDL["Generated handlers\n(Create, Update, Delete, Activate)"]
        CLOSE["CloseAccountGroupHandler\n(hand-written, replaces generated)"]
        BALQ["GetAccountGroupBalancesQueryHandler"]
        SPEC["SpecGetAccountGroup / SpecListAccounts"]
    end

    subgraph Domains["DKNet.Accounts.Domains"]
        ENT["AccountGroup (AggregateRoot)\nUpdate / Activate / Close"]
    end

    subgraph Infra["DKNet.Accounts.Infra"]
        MAP["AccountGroupConfigs.cs"]
        REPO["IRepositorySpec"]
    end

    DB[("PostgreSQL — pro.AccountGroups")]

    Client -->|HTTP| EP -->|IMessageBus.Send| VAL --> HDL --> ENT
    EP --> CLOSE --> ENT
    CLOSE -->|SpecListAccounts, cross-aggregate check| REPO
    Client --> BAL --> BALQ --> SPEC --> REPO
    HDL --> REPO --> MAP --> DB
```

## Create Account Group — Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant EP as AccountGroupsV1Endpoint
    participant BUS as IMessageBus
    participant VAL as CreateAccountGroupCommandValidator
    participant SPEC as SpecGetAccountGroup
    participant REPO as IRepositorySpec
    participant HDL as generated Create handler

    C->>EP: POST /v1/account-groups
    EP->>BUS: bus.Send(CreateAccountGroupRequest)
    BUS->>VAL: Validate(request)
    VAL->>SPEC: SpecGetAccountGroup(byCode)
    VAL->>REPO: AnyAsync(spec)
    REPO-->>VAL: false (code free)
    VAL-->>BUS: Valid
    BUS->>HDL: Handle(request)
    HDL->>HDL: new AccountGroup(code, name, description, type, ownerId, metadata)
    HDL->>REPO: AddAsync(entity)
    Note over REPO: SaveChanges runs after the handler returns —<br/>DKNet's SlimBus EF Core interceptor auto-saves.
    HDL-->>EP: AccountGroupDto
    EP-->>C: 201 Created + AccountGroupDto
```

## Close Account Group — Sequence Diagram

Close is the one route where the generated handler is replaced, because the refusal reads a
*different* aggregate (`Account`) than the one being closed:

```mermaid
sequenceDiagram
    participant C as Client
    participant EP as AccountGroupsV1Endpoint
    participant HDL as CloseAccountGroupHandler
    participant SPEC as SpecGetAccountGroup
    participant ACCTS as SpecListAccounts
    participant REPO as IRepositorySpec

    C->>EP: POST /v1/account-groups/{id}/close
    EP->>HDL: Handle(request)
    HDL->>SPEC: SpecGetAccountGroup(byId)
    HDL->>REPO: FirstOrDefaultAsync(spec)
    REPO-->>HDL: group (404 if null)
    HDL->>ACCTS: SpecListAccounts(groupId)
    HDL->>REPO: AnyAsync(a => a.Balance != 0 || a.HeldAmount != 0)
    alt any account holds a balance
        REPO-->>HDL: true
        HDL-->>EP: 422 GROUP_HOLDS_BALANCE
    else group is clean
        REPO-->>HDL: false
        HDL->>HDL: group.Close()
        Note over REPO: SaveChanges runs after the handler returns —<br/>the handler itself never calls SaveChangesAsync.
        HDL-->>EP: 200 + AccountGroupDto
    end
```

## Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Active : Create (Status = Active, always)
    Active --> Closed : POST /{id}/close\n(refused GROUP_HOLDS_BALANCE if any\naccount it holds carries a balance)
    Closed --> Active : POST /{id}/activate (unconditional)
```

`Delete` is not a transition on this diagram — it removes the row entirely, refused
(`GROUP_NOT_EMPTY`) while the group holds any account regardless of status.

## Layer Responsibilities

| Layer | Responsibility in this feature |
|-------|-------------------------------|
| `DKNet.Accounts.Api` | Composite route registration plus two hand-mapped reads (`balances`, `status-counts`); no business logic |
| `DKNet.Accounts.AppServices` | Validators (code uniqueness, non-empty update, empty-group delete); `CloseAccountGroupHandler`; `GetAccountGroupBalancesQueryHandler` |
| `DKNet.Accounts.Domains` | `AccountGroup` entity: `Update`, `Activate`, `Close` |
| `DKNet.Accounts.Infra` | `AccountGroupConfigs` EF mapping, including the `Metadata` JSON-string conversion |
