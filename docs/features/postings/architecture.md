# Postings — Architecture

> Diagrams below are Mermaid, pending an archify render — no diagram is skipped.

## Vertical Slice Overview

Only one route in this slice is generated (`GET /v1/postings/{id}`, via the generic
`MapGetById<Posting, Guid, PostingDto>`); every other route — list, record, batch, reverse, and the
statement route mapped on the accounts group — is hand-written, because each carries orchestration a
generator cannot express: a lock, an idempotency replay, or a cross-aggregate refusal.

```mermaid
graph TD
    Client["Client"]

    subgraph API["DKNet.Accounts.Api"]
        LIST["GET / (hand-mapped)"]
        REC["POST / (hand-mapped, Idempotency-Key header)"]
        BATCH["POST batch (hand-mapped, Idempotency-Key header)"]
        GET["GET {id} (generated MapGetById)"]
        REV["POST {id}/reverse (MapActionById, Idempotency-Key required)"]
        STMT["GET /v1/accounts/{id}/statement\n(mapped on AccountsV1Endpoint)"]
    end

    subgraph AppServices["DKNet.Accounts.AppServices"]
        RECH["RecordPostingCommandHandler"]
        BATCHH["RecordPostingBatchCommandHandler"]
        REVH["ReversePostingCommandHandler"]
        LISTQ["ListPostingsQueryHandler"]
        STMQ["GetAccountStatementQueryHandler"]
        LOCK["IAccountLockProvider"]
        SIG["PostingSignature"]
        SPEC["SpecGetPosting / SpecListPostings*"]
    end

    subgraph Domains["DKNet.Accounts.Domains"]
        POST_ENT["Posting (AggregateRoot)"]
        ACCT_ENT["Account.TryApplyPosting\n(status gate + floor, see Accounts)"]
    end

    subgraph Infra["DKNet.Accounts.Infra"]
        MAP["PostingConfigs.cs"]
        REPO["IRepositorySpec"]
    end

    DB[("PostgreSQL — pro.Postings")]

    Client --> REC --> RECH
    RECH --> LOCK
    RECH --> SIG
    RECH -->|apply| ACCT_ENT
    RECH --> POST_ENT --> REPO
    Client --> BATCH --> BATCHH --> LOCK
    BATCHH --> ACCT_ENT
    BATCHH --> POST_ENT
    Client --> REV --> REVH --> LOCK
    REVH --> POST_ENT
    REVH --> ACCT_ENT
    Client --> LIST --> LISTQ --> SPEC
    Client --> GET --> SPEC
    Client --> STMT --> STMQ --> SPEC
    SPEC --> REPO --> MAP --> DB
```

## Record a Posting — Sequence Diagram

The main write route for this feature, from the endpoint through the lock, the idempotency check, the
account's own rules, to the database and back.

```mermaid
sequenceDiagram
    participant C as Client
    participant EP as PostingsV1Endpoint
    participant HDL as RecordPostingCommandHandler
    participant SIG as PostingSignature
    participant SPEC as SpecGetPosting
    participant LOCK as IAccountLockProvider
    participant ACCT as Account.TryApplyPosting
    participant REPO as IRepositorySpec

    C->>EP: POST /v1/postings (Idempotency-Key header)
    EP->>HDL: Handle(request)
    HDL->>SIG: Compute(request) → signature
    HDL->>SPEC: SpecGetPosting(byCallingSystem, byIdempotencyKey)
    HDL->>REPO: FirstOrDefaultAsync(spec)
    alt existing posting with same key
        REPO-->>HDL: existing
        alt signature matches
            HDL-->>EP: 200 + existing PostingDto (replay)
        else signature differs
            HDL-->>EP: 409 IDEMPOTENCY_KEY_CONFLICT
        end
    else no existing posting
        HDL->>HDL: currency lookup (active?) — else 422 UNSUPPORTED_CURRENCY
        HDL->>HDL: PostingAmount.Validate — else 422 INVALID_POSTING_AMOUNT
        HDL->>HDL: effectiveDate <= recordedAt — else 422 EFFECTIVE_DATE_IN_FUTURE
        HDL->>LOCK: AcquireAsync(accountId, 10s)
        alt lock times out
            LOCK-->>HDL: timeout
            HDL-->>EP: 422 LOCK_TIMEOUT
        else lock acquired
            HDL->>HDL: account.CurrencyCode == currency? else 422 CURRENCY_MISMATCH
            HDL->>ACCT: TryApplyPosting(isDebit, amount, effectiveDate)
            alt refused
                ACCT-->>HDL: AccountClosed / AccountFrozen / AccountDormantDebitRefused / InsufficientFunds / AmountOutOfRange
                HDL-->>EP: 422 <mapped code>
            else applied
                ACCT-->>HDL: signedValue, balanceAfter, streamPosition
                HDL->>HDL: new Posting(...)
                HDL->>REPO: AddAsync(entity) + SaveChangesAsync()
                REPO-->>HDL: OK
                HDL-->>EP: 201 Created + PostingDto
            end
        end
    end
```

## Reverse a Posting — Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant HDL as ReversePostingCommandHandler
    participant SIG as PostingSignature
    participant LOCK as IAccountLockProvider
    participant ORIG as original Posting
    participant ACCT as Account.TryApplyPosting(isReversal: true)
    participant REPO as IRepositorySpec

    C->>HDL: POST {id}/reverse (reason, Idempotency-Key required)
    HDL->>SIG: Hash("reverse|{id}|{reason}")
    HDL->>REPO: replay/conflict pre-check (same shape as Record)
    HDL->>LOCK: AcquireAsync(original.AccountId, 10s)
    HDL->>ORIG: re-read tracked, inside the lock
    alt already reversed
        ORIG-->>HDL: Status == Reversed
        HDL-->>C: 422 POSTING_ALREADY_REVERSED
    else not yet reversed
        HDL->>ACCT: TryApplyPosting(opposite direction, original.Amount, isReversal: true)
        Note over ACCT: floor check skipped — a reversal may leave the account\nbelow floor — but status gate still applies
        alt status refuses (Closed / Frozen / wrong-direction Dormant)
            ACCT-->>HDL: refused
            HDL-->>C: 422 <mapped code>
        else applied
            HDL->>HDL: new reversal Posting; reversal.LinkAsReversalOf(original.Id)
            HDL->>ORIG: original.MarkReversedBy(reversal.Id)
            HDL->>REPO: SaveChangesAsync()
            HDL-->>C: 200 + reversal PostingDto
        end
    end
```

## The per-account lock

`IAccountLockProvider` (`Domains/Services/IAccountLockProvider.cs`), implemented by
`AccountLockProvider` (`Infra/Services/AccountLockProvider.cs`) as a
`ConcurrentDictionary<Guid, SemaphoreSlim>` keyed per account id.

> ponytail: this is a **single-process, in-memory lock** — correct for one running instance, not for
> a horizontally-scaled deployment, where two instances could each acquire "their own" lock for the
> same account. Upgrade path: a database-level advisory lock (e.g. Postgres
> `pg_advisory_xact_lock`), or an optimistic unique-index-plus-retry scheme, if this service is ever
> scaled to more than one instance.

The idempotency pre-check runs *before* the lock is acquired (a deliberate, documented trade-off): two
first-uses of the same key can both miss that read, and the second is then refused `409` by the
database's own unique index on `(CallingSystem, IdempotencyKey)` rather than replayed — a narrow,
accepted race, not a silent double-post.

## Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Posted : Record / RecordBatch (always)
    Posted --> Reversed : POST {id}/reverse\n(refused POSTING_ALREADY_REVERSED if already reversed;\nrefused per the account's own status gate)
```

`Reversed` is terminal — `MarkReversedBy` throws if called twice, so a posting can be reversed at most
once.

## Layer Responsibilities

| Layer | Responsibility in this feature |
|-------|-------------------------------|
| `DKNet.Accounts.Api` | Route mapping only — one generated read, four hand-mapped routes plus the statement route on the accounts group |
| `DKNet.Accounts.AppServices` | Locking, idempotency replay/conflict, every business-rule check and its `LedgerErrors` code, the 90-day list-window validator |
| `DKNet.Accounts.Domains` | `Posting` entity (immutable once written, except the one-way `MarkReversedBy`); the status-gate and floor rules live on `Account`, not here |
| `DKNet.Accounts.Infra` | `PostingConfigs` EF mapping — the three indexes the ledger's invariants depend on (gapless stream position, idempotency, posting number) |
