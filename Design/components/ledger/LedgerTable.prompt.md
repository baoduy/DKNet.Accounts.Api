The list table for groups, accounts and currencies. 36px rows, 12px cell padding, hairline rules, muted header.

```jsx
<Card padded={false}>
  <LedgerTable
    rowKey="id"
    selectedId={selected?.id}
    onSelectRow={setSelected}
    columns={[
      { key: 'accountNumber', header: 'Account no.', sortable: true, render: r => <AccountNumber value={r.accountNumber} href={'/accounts/' + r.id} /> },
      { key: 'currency', header: 'Currency', sortable: true, queryAs: 'CurrencyCode', render: r => <Currency code={r.currency} /> },
      { key: 'status', header: 'Status', sortable: true, render: r => <StatusBadge status={r.status} /> },
      { key: 'balance', header: 'Balance', sortable: true, align: 'right', render: r => <Money amount={r.balance} decimalPlaces={r.decimalPlaces} /> },
      { key: 'availableBalance', header: 'Available', sortable: false, align: 'right', render: r => <Money amount={r.availableBalance} decimalPlaces={r.decimalPlaces} /> },
      { key: 'openedOn', header: 'Opened', sortable: false }
    ]}
    rows={accounts} />
</Card>
```

Two rules the API forces: `sortable: false` on `availableBalance` and `openedOn` (computed, so sorting them is a 400), and `queryAs: 'CurrencyCode'` on the currency column (the response reads `currency`, the query surface takes the other spelling).

**No action column.** Selecting a row opens the detail panel and the lifecycle actions live in its bottom bar.
