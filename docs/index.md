# DKNet.Accounts.Api Documentation

Reference docs for this account and ledger service. Start with
[the root README](../README.md), then use the [API contract](api-contract.md) for routes,
response fields, refusals, and invariants.

![An operator calls the API through the console; handlers use the selected database and an outbox relays events.](diagrams/runtime-architecture.svg)

## This service

- [Integration Guide](integration-guide.md) — the end-to-end walkthrough for a system calling this
  accounts and ledger service: authenticate, create a group, open an account, post, read the balance
  back, page a statement.
- [README](../README.md) — overview, local start, architecture, and links.
- [AGENTS.md](../AGENTS.md) — the architecture conventions this solution is held to.
- [API contract](api-contract.md) — every route, response field, refusal, invariant, and caller limit.
- [Deployment guide](deployment.md) — published artifacts, chart prerequisites, verification, and rollback.
- [Service background](service-background.md) — business scope and decisions on record.
- [Console](console.md) — the Next.js operations console: how to run it locally, its environment
  keys, and the Entra ID app registration it needs.
- [Local setup with Microsoft Entra ID](local-setup-entra.md) — register the Entra apps, fill in
  `.env`, and launch the stack with `docker compose`.
- [Accounts client (.NET)](accounts-client.md) — the `DKNet.Accounts.Client` NuGet package: a typed
  C# client for calling this service.
- [Manual verification](manual-verification.md) — the release-time checklist for what the automated
  suites can't reach (a real Entra ID sign-in).

## Delivery status

Every route in the [API contract](api-contract.md) is implemented and exercised by the acceptance
suite: reference currencies, account groups, accounts, postings, batches, reversals, and statements.
Held funds remain deferred; `heldAmount` always returns `0` and `availableBalance` equals `balance`.
Read the [caller limits](api-contract.md) before building against those fields.

## Features

Each feature is one page — overview, business domain, quick start, end-to-end flow, endpoints, data model, events and downstream systems:

| Feature | What it covers |
|---|---|
| [Currencies](features/currencies.md) | The reference currencies the service can denominate accounts and postings in. |
| [Account Groups](features/account-groups.md) | The bucket accounts belong to, classified by what it represents. |
| [Accounts](features/accounts.md) | Where a balance lives — currency, classification, floor, status. |
| [Postings](features/postings.md) | The append-only ledger — postings, batches, reversals and the account statement route. |

## How the plumbing works

- [API Request Pipeline](api-pipeline.md) — what happens to a request before it reaches a handler.
- [Endpoint Scope Declarations](endpoint-scope-declarations.md) — declaring a group's scopes once per
  HTTP method, overriding one route, and the startup refusal.
- [Configuration Reference](configuration-reference.md) — every `appsettings` key this service reads,
  including the `FeatureManagement` flag table.
- [Generic List Endpoint](generic-list-endpoint.md) — the filter/search/order/page contract
  `GET /v1/account-groups` and `GET /v1/accounts` both expose for free.
