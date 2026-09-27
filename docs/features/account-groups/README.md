# Account Groups

> The bucket accounts belong to — a named, coded owner for a set of accounts in one classification.

## What Is This?

A named, uniquely coded group that accounts sit inside, classified by what it represents
(`Customer`, `Merchant`, `Internal`, `Suspense`, `Settlement`), carrying its own owner identifier and
free-form metadata. A group holds accounts only, never another group. Groups can be listed and
filtered, renamed, closed and reactivated, deleted while they hold no account, and their balances
read one line per currency.

## Why Does It Exist?

- **Every account needs an owner bucket.** `Account.GroupId` always points at one group; there is no
  ungrouped account.
- **Closing and deleting need a safety gate.** A group cannot be closed or deleted while any account
  it holds carries a balance — the group-level equivalent of the account-level floor.
- **Reporting needs a rollup.** `GET /{id}/balances` sums a group's own accounts by currency, so a
  caller doesn't have to page every account in the group and sum client-side.

## Quick Start

### Create a group

```http
POST /v1/account-groups
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "ACME1",
  "name": "Acme Pte Ltd",
  "type": "Customer",
  "ownerId": "cust-00042"
}
```

### Read its balances

```http
GET /v1/account-groups/{id}/balances
Authorization: Bearer {token}
```

```json
[{ "currency": "SGD", "balance": 12400.00 }]
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| **`code`** | Your own unique code (≤ 5 characters), upper-cased on write. Unique across the service; a duplicate is refused. |
| **`type`** | Fixed at creation — there is no method that changes it. |
| **`status`** | `Active`/`Closed`. Closing is refused while any account the group holds carries a balance or held amount. |
| **Delete** | The service's *only* delete route — refused while the group holds any account, even a closed, zero-balance one. |
| **Balances** | A rollup read (`GET /{id}/balances`), not a stored field — computed live from the group's own accounts, grouped by currency. |

## Feature Map

| Layer | Path |
|-------|------|
| Domain entity | `ApiEndpoints/DKNet.Accounts.Domains/Features/AccountGroups/Entities/AccountGroup.cs` |
| EF Core mapping | `ApiEndpoints/DKNet.Accounts.Infra/Features/AccountGroups/Mappers/AccountGroupConfigs.cs` |
| Create/Update/Delete validators | `ApiEndpoints/DKNet.Accounts.AppServices/AccountGroups/V1/Actions/Create.cs`, `Update.cs`, `Delete.cs` |
| Close handler | `ApiEndpoints/DKNet.Accounts.AppServices/AccountGroups/V1/Actions/Close.cs` |
| Balances query | `ApiEndpoints/DKNet.Accounts.AppServices/AccountGroups/V1/Queries/GetAccountGroupBalances.cs` |
| Spec | `ApiEndpoints/DKNet.Accounts.AppServices/AccountGroups/V1/Specs/SpecGetAccountGroup.cs` |
| DTO | `ApiEndpoints/DKNet.Accounts.AppServices/AccountGroups/V1/AccountGroupDto.cs` |
| API endpoint | `ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/AccountGroups/AccountGroupsV1Endpoint.cs` |

## Related Documentation

- [Architecture](architecture.md)
- [API Reference](api-reference.md)
- [Data Model](data-model.md)
- [Accounts](../accounts/README.md) — every account belongs to exactly one group.
