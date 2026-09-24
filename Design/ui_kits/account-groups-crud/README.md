# Account groups — CRUD screen

A standalone mockup of the Administration → Account groups screen, built on this system's
components. Open `index.html`.

Navigation as specified: **LEDGER** — Overview, Accounts, Records. **ADMINISTRATION** —
Account groups, Currencies.

## The five operations

| Operation | Surface |
|---|---|
| Create | Right-hand panel, opened by *New group* |
| View details | Right-hand panel, opened by a row |
| Edit | Right-hand panel, opened by *Edit group* in the view panel |
| Close (archive) | Panel footer action, confirmed by dialog |
| Export | Page-header action, acknowledged inline |

The panel slides in over the right edge of the table; the page behind it stays put and is
never dimmed, so a second row swaps the panel's contents without closing it.

## Feedback, by weight

- **Inline, above the table** — created, saved, closed, export queued: a card with a 3px
  `--credit` rule, dismissible.
- **Inline, in the panel** — validation refusals render as a `RefusalAlert` with the API's
  own codes (`INVALID_GROUP_CODE`, `GROUP_CODE_TAKEN`), and the offending field takes the
  destructive border.
- **Disabled and explained** — *Close group* stays on screen when the group holds balances,
  with `GROUP_HOLDS_BALANCE` in the footnote.
- **Dialog** — only where a click has consequence: closing a group, and discarding unsent
  edits.

Fields follow the API payload: `code`, `name`, `description`, `type`, `metadata`. `ownerId` is
not a form field — the auth layer stamps it from the token, and it is shown back on the group.
`code` is editable on create and locked on edit, because it is the prefix of every account
number in the group.
