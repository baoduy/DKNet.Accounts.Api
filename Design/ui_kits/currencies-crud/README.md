# Currencies — CRUD screen

Administration → Currencies, built on the same pattern as the account-groups screen. Open
`index.html`.

## Payload

`code`, `name`, `decimalPlaces` — the three fields the API takes. `status`, `accounts` and
`createdOn` are server-side, shown read-only.

## The five operations

| Operation | Surface |
|---|---|
| Create | Right-hand panel, opened by *New currency* |
| View details | Right-hand panel, opened by a row |
| Edit | Right-hand panel, opened by *Edit currency* in the view panel |
| Close (archive) | Panel footer action, confirmed by dialog |
| Export | Page-header action, acknowledged inline |

## What is locked, and why

`code` and `decimalPlaces` are editable on create and locked on edit: every amount in the
ledger is stored as a minor unit at the registered scale, so changing it would restate
balances. Only `name` can be corrected afterwards. The create form echoes the scale back as
a worked example (`1,250 SGD → 1,250.00`) before it becomes permanent.

## Refusals

`CURRENCY_CODE_REQUIRED`, `INVALID_CURRENCY_CODE`, `CURRENCY_CODE_TAKEN`,
`CURRENCY_NAME_REQUIRED`, `DECIMAL_PLACES_REQUIRED`, `INVALID_DECIMAL_PLACES` render in a
`RefusalAlert` in the panel, with the offending field taking the destructive border.
*Close currency* stays on screen but disabled while accounts hold a balance, with
`CURRENCY_HOLDS_BALANCE` explained in the view panel.
