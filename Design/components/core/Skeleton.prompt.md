A loading placeholder shaped like the thing that is loading. No shimmer, no spinner.

```jsx
<div style={{display:'flex',gap:8}}>
  {[0,1,2,3].map(i => <Skeleton key={i} height={30} />)}
</div>
```

Used on the Overview status tiles, which are blocked on an API route that does not exist yet — the skeleton sits there with a Note explaining why, rather than a count computed client-side that would be silently wrong above 1000 records.
