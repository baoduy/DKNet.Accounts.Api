Every amount in the console goes through Money. Do not hand-format a number anywhere.

```jsx
<Money amount={12400} decimalPlaces={2} />              // 12,400.00
<Money amount={-892.45} decimalPlaces={2} signed />     // −892.45, rose
<Money amount={0} currency="JPY" decimalPlaces={0} />   // 0
<Money amount={-892.45} decimalPlaces={2} signed struck /> // reversed row
<Money amount={12400} size="tile" align="left" />       // balance tile
```

Rules: **decimals come from `Currency.decimalPlaces`**, never a literal 2 — JPY takes none, BHD takes three. Tabular numerals, right-aligned in tables. The sign is a character, `+` or U+2212 (not a hyphen); colour is added on top so the ledger still reads in greyscale. Parse and validate amounts as strings against the currency's precision — `Math.round` is banned on money.
