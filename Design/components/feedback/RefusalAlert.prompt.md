Renders the API's `errors[]` array where the user already is.

```jsx
<RefusalAlert errors={[{ code: 'INSUFFICIENT_FUNDS', message: 'This would take the account below its floor of −5,000.00 SGD' }]} />
<RefusalAlert errors={[{ message: 'The request could not be completed.' }]} traceId="0HN7…" retry={<Button size="sm">Retry</Button>} />
```

An error carrying `field` belongs on that field, not in this block — `DUPLICATE_GROUP_CODE` renders on the code input, `INVALID_POSTING_AMOUNT` on the amount. Always show the code. Only `LOCK_TIMEOUT` and transport failures get a retry affordance; a business refusal does not become true on a second try.
