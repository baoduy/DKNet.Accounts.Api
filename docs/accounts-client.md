# DKNet.Accounts.Client — consumer guide

The `DKNet.Accounts.Client` NuGet package: a typed C# client for calling this service from another
.NET application, so the calling application never hand-builds a route string or parses a refusal
body itself.

## ✨ Why use it?

- **Every route, one interface.** `IAccountClient` has one method per live route of this service —
  account groups, accounts, currencies, postings — kept in sync with the service by an acceptance
  test that walks the interface by reflection, not by hand.
- **Your credential stays yours.** The client never obtains, stores or logs one; it only sends
  whatever `DelegatingHandler` your application registers on it.
- **A refusal is typed data.** A non-2xx response throws `AccountApiException` with the status code
  and the service's `errors[]` entries already turned into `AccountApiError.Code` / `.Field` /
  `.Message` — never a JSON body you parse by hand.

## 🚀 Quick Start

Install and register — see [the package README](../ApiEndpoints/DKNet.Accounts.Client/README.md) for
the GitHub Packages feed and token setup:

```csharp
services.AddAccountClient(new Uri("https://accounts.example.com"));

var client = provider.GetRequiredService<IAccountClient>();
var currencies = await client.GetCurrenciesAsync();
```

## 🧩 Features

### Route coverage, by area

`IAccountClient` covers all 28 routes this service exposes, grouped the same way the
[root README's feature list](../README.md) groups them. No method exists for the health, OpenAPI or
docs-browser addresses — those are operational, not part of the integration surface.

| Area | Methods |
|---|---|
| Account groups (10) | `CreateAccountGroupAsync`, `GetAccountGroupsAsync`, `GetAccountGroupAsync`, `RenameAccountGroupAsync`, `ChangeAccountGroupDescriptionAsync`, `ChangeAccountGroupMetadataAsync`, `CloseAccountGroupAsync`, `ActivateAccountGroupAsync`, `DeleteAccountGroupAsync`, `GetAccountGroupBalancesAsync` |
| Accounts (8) | `OpenAccountAsync`, `GetAccountsAsync`, `GetAccountAsync`, `GetAccountBalanceAsync`, `RenameAccountAsync`, `ChangeAccountMetadataAsync`, `UpdateAccountAsync`, `GetAccountStatementAsync` |
| Currencies (6) | `GetCurrenciesAsync`, `GetCurrencyAsync`, `CreateCurrencyAsync`, `RenameCurrencyAsync`, `ActivateCurrencyAsync`, `DeactivateCurrencyAsync` |
| Postings (4) | `RecordPostingAsync`, `RecordPostingBatchAsync`, `GetPostingAsync`, `ReversePostingAsync` |

`UpdateAccountAsync` is the one PATCH-shaped method: passing a non-null `status` of `Closed` closes
the account, mirroring the service's own PATCH contract.

### List-query arguments

`GetAccountGroupsAsync`, `GetAccountsAsync` and `GetCurrenciesAsync` each take an optional query
record (`AccountGroupsListQuery`, `AccountsListQuery`, `CurrenciesListQuery`) built from the shared
`ListQuery` base — the same filter/search/order/paging contract as every generated list route on this
service, detailed in [docs/generic-list-endpoint.md](generic-list-endpoint.md):

| Property | Sent as | Meaning |
|---|---|---|
| `Filters` | repeated `filter` | One `ListFilter(Field, Operation, Value)` per entry, ANDed |
| `Search` | `search` | Free-text OR search across string fields, 2 characters minimum |
| `OrderBy` / `Desc` | `orderBy` / `desc` | Sort field and direction |
| `PageNumber` / `PageSize` | `pageNumber` / `pageSize` | 1-based page, size clamped server-side |
| `FromDate` / `ToDate` | `fromDate` / `toDate` | Inclusive bound on the record's last-active moment |

`GetAccountStatementAsync` takes its own `StatementQuery` instead — `From`/`To` (`DateOnly`) and
`PageIndex`/`PageSize` — the service keeps the statement surface separate from the generic list
contract.

Every list and statement method returns `PagedResult<TResult>`, mirroring the service's paged
response envelope: `Items`, `PageCount`, `PageNumber`, `PageSize`, `TotalItemCount`,
`HasNextPage`, `HasPreviousPage`.

### The idempotency key is a header, not a body field

`RecordPostingAsync` and `RecordPostingBatchAsync` each take an `idempotencyKey` method argument —
sent as the `Idempotency-Key` request header, exactly like a direct HTTP call to this service
(see [docs/integration-guide.md §5](integration-guide.md#5-post-a-credit)). It is never a property
on `RecordPostingRequest` or `RecordPostingBatchRequest`. Repeating the same key with the same
content returns the original posting; repeating it with different content throws
`AccountApiException` with `Code` `IDEMPOTENCY_KEY_CONFLICT`.

### A refusal reaches the caller as a code, not JSON

The service answers a business-rule refusal with `application/problem+json` and an `errors[]` array
whose entries carry a stable `code` (see
[docs/integration-guide.md §2](integration-guide.md#2-create-an-account-group)). The client turns
that into an `AccountApiException`:

```csharp
try
{
    await client.RecordPostingAsync(request, idempotencyKey);
}
catch (AccountApiException ex)
{
    // ex.StatusCode is the HTTP status
    foreach (var error in ex.Errors)
    {
        // error.Code    — stable business-rule code, e.g. "INSUFFICIENT_FUNDS" (never both Code and Field)
        // error.Field   — validation field name, e.g. "Code", when the refusal is a validation error instead
        // error.Message — human text; never branch on this, it can change
    }
}
```

Branch on `error.Code`, never on `error.Message` — the same rule as calling the service directly.

## ⚙️ Configuration reference

`AddAccountClient` has two overloads, both registering `IAccountClient` as a typed `HttpClient`
pointed at `baseAddress`:

| Overload | Effect |
|---|---|
| `AddAccountClient(services, baseAddress)` | No message handler attached — the application sends no credential of its own. |
| `AddAccountClient(services, baseAddress, messageHandlerType)` | Chains the given `DelegatingHandler` (already registered in `services`) onto every request, so the application can attach a credential. |

## ⚠️ Gotchas & limits

- The client attaches no `Authorization` header, retry policy or timeout of its own — supply those
  through your own `DelegatingHandler` or `HttpClient` configuration.
- `RecordPostingAsync` / `RecordPostingBatchAsync` refuse to compile the idempotency key into the
  request body — always pass it as the method's `idempotencyKey` argument, never as metadata.
- `AccountClient` can also be constructed directly around any `HttpClient` (for example a
  `WebApplicationFactory`'s in-memory one) — useful as an integration-test seam, not just through DI.

## 🔗 Related docs

- [Package README](../ApiEndpoints/DKNet.Accounts.Client/README.md) — install, restore token setup,
  and the smallest runnable example.
- [Integration guide](integration-guide.md) — the same routes called directly over HTTP, with real
  payloads.
- [Generic list endpoint](generic-list-endpoint.md) — the full filter/search/order/page contract
  `ListQuery` mirrors.
