The status pill. Use it for every account, group, posting and currency status so the colour map stays in one place.

```jsx
<StatusBadge status="Active" />    // green
<StatusBadge status="Dormant" />   // amber — debits refused
<StatusBadge status="Frozen" />    // rose  — no movement at all
<StatusBadge status="Closed" />    // grey
<StatusBadge status="Posted" />    // blue
<StatusBadge status="Reversed" />  // grey
```

Hue carries severity, not decoration: amber blocks half of what you can do, rose blocks all of it. If you need a status that is not in `STATUS_TONE`, add it to the map rather than passing `tone` at the call site.
