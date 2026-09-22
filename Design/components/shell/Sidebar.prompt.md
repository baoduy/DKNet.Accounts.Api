The console's left navigation — two sections, ADMINISTRATION pinned to the bottom.

```jsx
<Sidebar active="accounts" onNavigate={(item) => go(item.id)} />
```

Entries are Overview · Account groups · Accounts · Record posting (LEDGER), then Currencies (ADMINISTRATION). **Do not add a Transactions entry** — the API has no route that lists postings across accounts, so it would lead to a screen that cannot be built. Postings are reached through a statement, through search, or by permalink.

Account groups live under LEDGER, not Administration: groups carry per-currency balances and own the accounts, so they are the natural drill-down root.
