A dropdown, with an optional inline label so a filter bar reads as a sentence.

```jsx
<Select label="Status:" options={['Any','Active','Dormant','Frozen','Closed']} value={status} onChange={onStatus} />
<Select options={CATEGORIES} value={category} onChange={onCategory} />
```

Filter bars above a table use the labelled form and sit in a `CardBar`. Enum option lists must come from the service's own enums — `AccountStatus`, `PostingCategory` and the rest are never retyped by hand.
