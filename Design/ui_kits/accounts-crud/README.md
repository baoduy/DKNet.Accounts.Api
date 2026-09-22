# Accounts — CRUD screen

Ledger → Accounts, built on the same pattern as the account-groups and currencies screens.
Open `index.html`.

## Payload

`groupId`, `accountNumber`, `name`, `currency`, `classification`, `permittedToGoNegative`,
`overdraftLimit`, `minimumBalance`, `externalReference`, `metadata`. `accountNumber` is null
on create — the service assigns it from the group code. `status`, `balance`,
`availableBalance`, `heldAmount` and `openedOn` are server-side, shown read-only.

## The five operations

| Operation | Surface |
|---|---|
| Create | Right-hand panel, opened by *Open account* |
| View details | Right-hand panel, opened by a row |
| Edit | Right-hand panel, opened by *Edit account* in the view panel |
| Close | Panel footer action, confirmed by dialog |
| Export | Page-header action, acknowledged inline |

## What is editable, and what is not

Only `name`, `classification`, `permittedToGoNegative`, `overdraftLimit`, `minimumBalance`
and `metadata` are editable. `groupId`, `accountNumber`, `currency` and `externalReference
` render as locked fields on edit: the group code is the number's prefix, and the currency
fixes the scale every stored amount on the account already uses.

## The floor policy

The three floor fields are one decision, so they sit together under one label. With
*Permitted to go negative* on, an overdraft limit is required — a null limit is refused with
`OVERDRAFT_LIMIT_REQUIRED` — and the limit field is unavailable and cleared when it is off.
`FloorLine` states the computed floor under the policy in the view panel.

## Refusals

`ACCOUNT_GROUP_REQUIRED`, `ACCOUNT_NAME_REQUIRED`, `ACCOUNT_CURRENCY_REQUIRED`,
`INVALID_CLASSIFICATION`, `OVERDRAFT_LIMIT_REQUIRED`, `OVERDRAFT_LIMIT_NOT_PERMITTED`,
`INVALID_OVERDRAFT_LIMIT`, `INVALID_MINIMUM_BALANCE`, `MINIMUM_BALANCE_BELOW_ZERO` and
`AMOUNT_SCALE_EXCEEDS_CURRENCY` render in a `RefusalAlert` in the panel, with the offending
field taking the destructive border. *Close account* stays on screen but disabled while the
balance is non-zero, with the balance and `ACCOUNT_HOLDS_BALANCE` in the footnote.

## Sorting

`Available` and `Opened` carry no sort control — both are computed on the entity, so
`orderBy` on either answers 400.
