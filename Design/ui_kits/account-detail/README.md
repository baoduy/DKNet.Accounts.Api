# Account detail — one account

Opened from any account number: `index.html?account=ACME-000123`. An unknown or missing
parameter falls back to the first account rather than an empty page.

Account numbers are links in the Accounts table and in the Account column of the Records
table. The rest of the row still opens the detail panel — a link inside a row navigates.

## What is on the page

- **Balance, available and held** as three tiles, with the computed floor under them.
- **The account's records**, filtered by period, direction, category and status — the
  Records screen's table scoped to one account, with the Account column dropped and
  Description in its place.
- **Record posting** in the right-hand panel, with account and currency locked: this
  account's currency fixes the scale, so neither is a choice here.
- **Reverse** from a record's panel, with the same required reason as the Records screen.
- **Edit account** from the pencil button beside the status badge, in the same panel: name,
  classification, floor policy and metadata — the fields the API lets you change. Account
  number, group and currency show locked.

Posting or reversing updates the tiles above, so the floor check on the next record is made
against the balance the page is showing.

## Not a statement

This table sorts, so it carries no *Balance after* column. A running balance is only true in
stream order, which is the statement's contract, not this one's.
