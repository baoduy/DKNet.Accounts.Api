# Currencies — API Reference

**Base path**: `/v1/currencies` · **Auth**: Bearer token, scope named per route below · **Content-Type**: `application/json`

All six routes are one composite registration —
`group.MapCurrencyCrud(o => o.Exclude(CrudOp.Delete))`
(`ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Currencies/CurrenciesV1Endpoint.cs`) — except
Deactivate, whose generated handler is replaced by a hand-written one. There is no delete route:
a currency is retired by deactivating it. The full error-code and refusal-body contract is in
[the README](../../../README.md#refusals-and-error-codes); this page states only what applies to
this slice.

## Endpoints Summary

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| `GET` | `/v1/currencies` | List currencies (filter/search/order/page) | `accounts.read` |
| `GET` | `/v1/currencies/{id}` | Read one currency | `accounts.read` |
| `POST` | `/v1/currencies` | Register a currency | `accounts.write` |
| `PUT` | `/v1/currencies/{id}` | Rename a currency | `accounts.write` |
| `POST` | `/v1/currencies/{id}/activate` | Reactivate a currency | `accounts.write` |
| `POST` | `/v1/currencies/{id}/deactivate` | Deactivate a currency | `accounts.write` |

---

## `GET /v1/currencies`

Lists currencies. Generated `MapGetList<Currency, Guid, CurrencyDto>()` route — full filter/search/
order/page contract: [Generic List Endpoint](../../generic-list-endpoint.md).

- **Auth:** `accounts.read` (`[EndpointGroupScope(ScopeNames.AccountsRead, Get)]`)
- **Response:** `200 OK` — `PagedResponse<CurrencyDto>`
- **Errors:** `400` unknown filter/order field or malformed filter triple

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/currencies?pageSize=50"
```

## `GET /v1/currencies/{id}`

Reads one currency.

- **Auth:** `accounts.read`
- **Request:** `id` (Guid, route)
- **Response:** `200 OK` — `CurrencyDto`
- **Errors:** `400` malformed id · `404` unknown id

```bash
curl -H "Authorization: Bearer $TOKEN" "https://accounts.example.com/v1/currencies/{id}"
```

## `POST /v1/currencies`

Registers a currency. Generated route; validation is a hand-written FluentValidation validator
(`CreateCurrencyCommandValidator`, `AppServices/Currencies/V1/Actions/Create.cs`), registered and
enforced independently of whether the route is generated or hand-mapped.

- **Auth:** `accounts.write`
- **Idempotency:** not idempotent — a retry registers a second currency if `code` differs, or is
  refused `DUPLICATE_CURRENCY_CODE` if it repeats one
- **Request:**

  | Field | Type | Required | Rules | From |
  |---|---|---|---|---|
  | `code` | string | ✓ | 3–10 letters (`^[A-Za-z]{3,10}$`), must not already exist (case-insensitive — stored upper-cased) | body |
  | `name` | string | ✓ | non-empty, ≤ 100 characters | body |
  | `decimalPlaces` | int | ✓ | 0–6 inclusive — every money column in this service stores 6 decimal places, so a currency can never be finer | body |

- **Response:** `201 Created` — `CurrencyDto`, `isActive: true`
- **Errors:** `422 DUPLICATE_CURRENCY_CODE` · `400` malformed body
- **Enforcement:** FluentValidation, enforced

```bash
curl -X POST "https://accounts.example.com/v1/currencies" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"XAU","name":"Gold (troy ounce)","decimalPlaces":4}'
```

## `PUT /v1/currencies/{id}`

Renames a currency. `Code`, `DecimalPlaces` and `IsActive` are untouched — there is no method that
changes them after creation/activation.

- **Auth:** `accounts.write`
- **Request:** `name` (string, required, ≤ 100 chars, `RenameCurrencyRequestValidator`)
- **Response:** `200 OK` — `CurrencyDto`
- **Errors:** `400` malformed id/body · `404` unknown id
- **Enforcement:** FluentValidation, enforced

```bash
curl -X PUT "https://accounts.example.com/v1/currencies/{id}" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Gold (troy ounce, refined)"}'
```

## `POST /v1/currencies/{id}/activate`

Reactivates a currency. No request body, no validator, no guard on the entity method — always
succeeds for a known id.

- **Auth:** `accounts.write`
- **Response:** `200 OK` — `CurrencyDto`, `isActive: true`
- **Errors:** `400` malformed id · `404` unknown id

```bash
curl -X POST "https://accounts.example.com/v1/currencies/{id}/activate" -H "Authorization: Bearer $TOKEN"
```

## `POST /v1/currencies/{id}/deactivate`

Deactivates a currency — the one hand-written handler in this slice
(`DeactivateCurrencyHandler`, replacing the generated one on the same route).

- **Auth:** `accounts.write`
- **Request:** none
- **Response:** `200 OK` — `CurrencyDto`, `isActive: false`
- **Errors:** `422 CURRENCY_HOLDS_BALANCE` — an account denominated in this currency still holds a
  non-zero balance or held amount (checked via `SpecListAccounts(currency: code)`, `AnyAsync(a =>
  a.Balance != 0m || a.HeldAmount != 0m)`) · `400` malformed id · `404` unknown id

```bash
curl -X POST "https://accounts.example.com/v1/currencies/{id}/deactivate" -H "Authorization: Bearer $TOKEN"
```

## Common Error Response Format

Every non-2xx response is `application/problem+json` — `title`, `status`, `type`, `traceId`, and an
`errors[]` list of `{ message, code, field }`. Full shape and the complete refusal-code table:
[the README](../../../README.md#refusals-and-error-codes).
