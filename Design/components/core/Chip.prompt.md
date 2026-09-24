An 11px tint label — posting categories, account classifications, and the small segmented pickers (Single / Batch, 7d / 30d / All).

```jsx
<Chip>Transfer</Chip>
<Chip selected onClick={() => setRange('30d')}>30d</Chip>
```

Smaller and quieter than `Badge`: a chip classifies, a badge signals state. Add `onClick` only when the chip is a control; a category chip on a statement row is not.
