The record-inspection panel. This is the console's central interaction — every list screen has one.

```jsx
<DetailPanel open={!!selected} title="ACME-000123 · Operating Account" onClose={() => setSelected(null)}
  moreHref="/accounts/acme-000123"
  footnote="Balance is 12,400.00 — closing is refused with ACCOUNT_HOLDS_BALANCE."
  actions={<Button disabled>Close account</Button>}>
  <DetailList items={[{ label: 'Account no.', value: <Mono>ACME-000123</Mono> }, …]} />
  <DetailSection>Balances</DetailSection>
  <DetailList items={[…]} />
</DetailPanel>
```

Sections are separated by a rule — `<DetailSection divider={false}>` on the first one, where there is nothing above it. Footer actions align to the right.

Mount it inside a `position: relative` region (`AppShell` handles this); it slides in over the right edge of the content, which stays where it is. Actions belong here and nowhere else; a table has no action column and no per-row buttons.
