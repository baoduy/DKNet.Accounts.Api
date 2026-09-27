# Accounts — Architecture

> Diagrams below are Mermaid, pending an archify render — no diagram is skipped.

## Vertical Slice Overview

Unlike Currencies and Account Groups, **Open is entirely hand-written** — `Account` carries no
`[CrudCreate]` constructor. `GetList`, `GetById` and rename/metadata (`ChangeDetails`) are the one
generated composite; every other route (balance, statement, status-counts, ledger balances, the
`PATCH` status/floor route) is hand-mapped.

```mermaid
graph TD
    Client["Client"]

    subgraph API["DKNet.Accounts.Api"]
        OPEN["POST / (hand-mapped Open)"]
        CRUD["MapAccountCrud(Exclude(Delete))\nGetList / GetById / ChangeDetails"]
        PATCH["PATCH {id} (hand-mapped)"]
        BAL["GET {id}/balance (hand-mapped)"]
        LEDGER["GET balances (hand-mapped)"]
        STMT["GET {id}/statement (hand-mapped,\nRequireScope postings.read)"]
        SC["GET status-counts (hand-mapped)"]
    end

    subgraph AppServices["DKNet.Accounts.AppServices"]
        OPENH["OpenAccountCommandHandler"]
        UPDH["UpdateAccountCommandHandler (PATCH)"]
        CDH["generated ChangeDetails handler"]
        BALQ["GetAccountBalanceQueryHandler"]
        LEDQ["GetLedgerBalancesQueryHandler"]
        STMQ["GetAccountStatementQueryHandler"]
        POLICY["AccountFloorPolicy / AccountPostingPolicy"]
        SPEC["SpecGetAccount / SpecListAccounts"]
    end

    subgraph Domains["DKNet.Accounts.Domains"]
        ENT["Account (AggregateRoot)\nChangeDetails / ChangeStatus / TryApplyPosting"]
    end

    subgraph Infra["DKNet.Accounts.Infra"]
        MAP["AccountConfigs.cs"]
        REPO["IRepositorySpec"]
    end

    DB[("PostgreSQL — pro.Accounts")]

    Client --> OPEN --> OPENH --> POLICY
    OPENH -->|SpecGetCurrency, SpecGetAccountGroup| SPEC
    OPENH --> ENT --> REPO
    Client --> CRUD --> CDH --> ENT
    Client --> PATCH --> UPDH --> POLICY
    UPDH --> ENT
    Client --> BAL --> BALQ --> SPEC
    Client --> LEDGER --> LEDQ --> SPEC
    Client --> STMT --> STMQ --> SPEC
    SPEC --> REPO --> MAP --> DB
```

## Open Account — Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant EP as AccountsV1Endpoint
    participant VAL as OpenAccountCommandValidator
    participant HDL as OpenAccountCommandHandler
    participant CUR as SpecGetCurrency
    participant GRP as SpecGetAccountGroup
    participant NUM as accountNumbers (sequence)
    participant REPO as IRepositorySpec

    C->>EP: POST /v1/accounts
    EP->>VAL: Validate(request)
    VAL-->>EP: Valid
    EP->>HDL: Handle(request)
    HDL->>CUR: lookup currency, must be active
    alt currency unknown or inactive
        CUR-->>HDL: not found / inactive
        HDL-->>EP: 422 UNSUPPORTED_CURRENCY
    end
    HDL->>HDL: AccountFloorPolicy.RequiresOverdraftLimit(...)
    alt permitted negative, no overdraft limit
        HDL-->>EP: 422 OVERDRAFT_LIMIT_REQUIRED
    end
    HDL->>GRP: lookup group by id
    alt group not found
        GRP-->>HDL: null
        HDL-->>EP: 404
    end
    HDL->>NUM: NextValueAsync() (if caller omitted a suffix)
    HDL->>HDL: accountNumber = "{group.Code}-{suffix}"
    HDL->>HDL: new Account(...)
    HDL->>REPO: AddAsync(entity) + SaveChangesAsync()
    REPO-->>HDL: OK
    HDL-->>EP: AccountDto
    EP-->>C: 201 Created + AccountDto
```

## Record a Posting Against an Account — Sequence Diagram

The status gate and floor check that guard every posting live on `Account`, not on `Posting` — shown
here because they are this entity's own domain rules; the full posting flow is in
[Postings' architecture](../postings/architecture.md).

```mermaid
sequenceDiagram
    participant HDL as RecordPostingCommandHandler
    participant ENT as Account.TryApplyPosting
    participant GATE as AccountPostingPolicy.StatusGate
    participant FLOOR as AccountFloorPolicy.Floor

    HDL->>ENT: TryApplyPosting(isDebit, amount, postedAt, isReversal)
    ENT->>GATE: check Status vs direction
    alt Closed, or Frozen, or (Dormant and debit)
        GATE-->>ENT: refuse
        ENT-->>HDL: AccountClosed / AccountFrozen / AccountDormantDebitRefused
    else status accepts the movement
        ENT->>ENT: check amount against PostingAmount.Ceiling
        alt over ceiling
            ENT-->>HDL: AmountOutOfRange
        else
            ENT->>FLOOR: projected balance vs Floor(...)
            alt below floor and not a reversal
                FLOOR-->>ENT: breach
                ENT-->>HDL: InsufficientFunds
            else
                ENT->>ENT: apply signed amount, advance StreamPosition
                ENT-->>HDL: applied
            end
        end
    end
```

## Status State Machine

Every transition below is reachable through `PATCH {id}` with `{"status": "<Value>"}`; only the move
to `Closed` is guarded.

```mermaid
stateDiagram-v2
    [*] --> Active : Open (Status = Active, always)
    Active --> Frozen : PATCH {status: "Frozen"}
    Active --> Dormant : PATCH {status: "Dormant"}
    Active --> Closed : PATCH {status: "Closed"}\n(refused ACCOUNT_HOLDS_BALANCE if balance\nor held amount is non-zero)
    Frozen --> Active : PATCH {status: "Active"}
    Dormant --> Active : PATCH {status: "Active"}
    Closed --> Active : PATCH {status: "Active"} (reopening)
    Frozen --> Closed : PATCH {status: "Closed"} (same guard)
    Dormant --> Closed : PATCH {status: "Closed"} (same guard)
```

`Frozen` accepts no posting in either direction; `Dormant` accepts credits only — enforced by
`AccountPostingPolicy.StatusGate` on every posting and reversal, not by this route.

## Layer Responsibilities

| Layer | Responsibility in this feature |
|-------|-------------------------------|
| `DKNet.Accounts.Api` | One hand-mapped Open route, one generated composite (list/read/rename), five further hand-mapped reads/writes; no business logic |
| `DKNet.Accounts.AppServices` | `OpenAccountCommandHandler` (account-number allocation, currency/floor checks), `UpdateAccountCommandHandler` (status/floor recheck), balance/statement queries |
| `DKNet.Accounts.Domains` | `Account` entity, `AccountFloorPolicy`, `AccountPostingPolicy` — the floor and status-gate rules every posting and every `PATCH` goes through |
| `DKNet.Accounts.Infra` | `AccountConfigs` EF mapping, including the two `Ignore`d computed properties |
