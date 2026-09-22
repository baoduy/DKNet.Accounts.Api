The three-value balance display. It takes the whole account on purpose — you cannot ask it for one number.

```jsx
<BalanceTiles account={account} />
<BalanceTiles account={account} layout="inline" />   // pinned above a statement
```

Pair it with `<FloorLine>` directly underneath. Balance and Available are equal today; they are still separate tiles because the day holds ship, one number would be wrong with no code change to blame.
