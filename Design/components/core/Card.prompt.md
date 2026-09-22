The console's one surface container — every table, tile and form panel sits in a Card.

```jsx
<Card><div className="lab">BALANCE</div>…</Card>

<Card padded={false}>
  <CardBar><Input placeholder="Search accounts…" /><Select … /></CardBar>
  <LedgerTable … />
  <CardBar position="bottom"><span>Page 1 — 4 postings</span></CardBar>
</Card>
```

Set `padded={false}` whenever a table runs to the card's edge, and use `CardBar` for the hairline-separated strips above and below it. `overlay` switches to `--shadow-overlay` and is for dialogs and the detail panel only — a card on the page never casts a real shadow.
