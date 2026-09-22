The one-line statement of how far an account may go negative, computed from three policy fields rather than stored.

```jsx
<BalanceTiles account={account} />
<FloorLine account={account} />
// Floor −5,000.00 SGD — permitted to go negative, overdraft limit 5,000.00.
```

Always sits directly under the balance tiles. It names the figure `INSUFFICIENT_FUNDS` is measured against, so a refused posting is explicable from the screen the user was already on. The invalid state (permitted to go negative with no limit) renders the refusal code instead of a number.
