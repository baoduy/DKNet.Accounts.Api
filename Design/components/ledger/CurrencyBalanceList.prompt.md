Group balances: one row per currency, never a total.

```jsx
<Card>
  <h2>Balances</h2>
  <CurrencyBalanceList balances={[
    { currency: 'SGD', amount: 1204882.5, decimalPlaces: 2 },
    { currency: 'USD', amount: 318004, decimalPlaces: 2 },
    { currency: 'JPY', amount: 44120000, decimalPlaces: 0 }
  ]} />
</Card>
```

The "never combined into a single total" note ships with the component and must not be removed — the API deliberately returns one line per currency, and the empty space under the column is exactly where someone would otherwise add a sum.
