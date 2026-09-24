Key/value pairs for the metadata bag on accounts, groups and postings.

```jsx
<MetadataEditor entries={meta} onChange={setMeta} />
<MetadataEditor readOnly entries={[{key:'region',value:'apac'},{key:'tier',value:'1'}]} />
```

Read-only collapses to the single mono line detail screens use (`region=apac · tier=1`). Keys and values are both monospace — they are compared by eye and often pasted.
