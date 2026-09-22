# Records — CRUD screen

Ledger → Records, built on the same pattern as the accounts, account-groups and currencies
screens. Open `index.html`.

## Payload

`accountId`, `direction`, `amount`, `currency`, `effectiveDate`, `category`, `description`,
`counterpartyAccountId`, `counterpartyReference`, `transactionGroupId`, `externalReference`,
`metadata`. `recordedBy` is not a form field — the API's auth layer stamps it from the token,
and it is shown back on the record. `currency` is not typed in: it is taken from the account and shown
locked, because the account fixes the scale every amount on it is stored at.

## The operations

| Operation | Surface |
|---|---|
| Create | Right-hand panel, opened by *Record posting*, confirmed by `ConfirmMovement` |
| View details | Right-hand panel, opened by a row |
| Reverse | Panel footer action, confirmed by `ConfirmMovement` |
| Export | Page-header action, acknowledged inline |

**There is no edit and no delete.** A record is immutable once posted, so the panel offers
*Reverse* where the other screens offer *Edit* and *Close*: a new opposing record is posted
and the original is marked Reversed. Both rows stay on the account. The panel footnote says
so before the click, and the confirm dialog says it again as a consequence.

## Idempotency

The key is minted when the create panel opens, not on submit, survives a failed validation,
and is regenerated only after a success. A double-click replays the first request and
answers 200, not 201.

## Refusals

`ACCOUNT_REQUIRED`, `ACCOUNT_NOT_POSTABLE`, `DEBIT_NOT_PERMITTED` (dormant account),
`AMOUNT_REQUIRED`, `INVALID_AMOUNT`, `AMOUNT_SCALE_EXCEEDS_CURRENCY`,
`EFFECTIVE_DATE_IN_FUTURE` and `INSUFFICIENT_FUNDS` render in a
`RefusalAlert` in the panel, with the offending field taking the destructive border.
`INSUFFICIENT_FUNDS` is computed against the account's own floor policy and names both the
resulting balance and the floor. *Reverse* stays on screen but disabled on a record that is
already reversed (`POSTING_ALREADY_REVERSED`) or that is itself a reversal
(`POSTING_IS_REVERSAL`).

## Effective-date filter

A single `Period` dropdown: last 7, 14, 30 or 90 days. 90 days is the ceiling — the service
refuses a wider effective-date window on this route.

## Balance after

Not a column here. It is a property of one account's stream and belongs on that account's
statement, not in a filtered cross-account list.
