Shows the idempotency key for a write, with copy and (after a success) regenerate.

```jsx
<Card><IdempotencyKeyField value={key} onRegenerate={resetForm} /></Card>
```

Mint the key **when the form mounts**, not on submit — otherwise a double-click sends two keys and records two postings. Let it survive a failed submit: if the first request actually landed, the corrected retry answers 409 `IDEMPOTENCY_KEY_CONFLICT`, which is correct. Regenerate only after a 201.
