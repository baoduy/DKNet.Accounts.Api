The title block at the top of every screen.

```jsx
<PageHeader icon="wallet" title="Settlement — APAC"
  meta={<><Mono>MERCH-000044</Mono><Caption>in</Caption><Mono>MERCH</Mono><Chip>Liability</Chip><StatusBadge status="Dormant" /><Caption>opened 14 Sep 2026</Caption></>}
  actions={<><Button href="/statement">View statement</Button><Button variant="primary" disabled>Record posting</Button></>} />
```

Use the **same glyph the sidebar uses** for that screen, at 20px. The meta row carries identifiers, classification chips and the status badge; the actions carry at most one `primary`.
