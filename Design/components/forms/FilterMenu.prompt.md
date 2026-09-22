# FilterMenu

The one filter control above a table. Search sits at the left of the `CardBar`; `FilterMenu`
sits at the right, beside the result count.

```jsx
<CardBar position="top">
  <Input placeholder="Search…" prefix={<Icon name="search" size={14} />} value={q} onChange={…} style={{ width: 272 }} />
  <Caption style={{ marginLeft: 'auto' }}>{rows.length} of {all.length}</Caption>
  <FilterMenu activeCount={active} onClear={clearAll}>
    <FilterField label="Status">
      <Select options={['Any', 'Active', 'Closed']} value={status} onChange={…} style={{ width: '100%' }} />
    </FilterField>
  </FilterMenu>
</CardBar>
```

Rules:

- **Count what is applied.** `activeCount` is the number of filters away from their default.
  Without it a closed panel hides why a row is missing from the list.
- **Search stays outside.** It is not a filter on one field; it is the fastest path to a
  known row, and it belongs where the eye starts.
- **`Select` without its inline `label`.** `FilterField` supplies the label; the inline form
  is for a bar, not a panel.
- Closes on outside click and on Esc. The page behind it is never dimmed.
