Text entry, and `ReadOnlyField` for a value that lives in a field shell but cannot be typed.

```jsx
<Input placeholder="Search accounts…" prefix={<Icon name="search" />} />
<Input numeric value="1,250.00" onChange={onAmount} />
<ReadOnlyField><Currency code="SGD" /> — from the account, locked</ReadOnlyField>
```

Use `numeric` for every amount: tabular numerals, right-aligned. Use `mono` for identifiers. A currency on Record posting is a `ReadOnlyField`, never a select — a mismatch is `CURRENCY_MISMATCH` and there is no reason to let it be typed.
