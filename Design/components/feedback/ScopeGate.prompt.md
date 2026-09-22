Wraps an action the session may not be allowed to perform.

```jsx
<ScopeGate scope="postings.reverse" granted={scopes.has('postings.reverse')}>
  <Button variant="primary">Reverse</Button>
</ScopeGate>
```

Renders the child disabled with *requires postings.reverse* beside it. **Disable, never hide** — a missing button is indistinguishable from a bug. This is a courtesy layer only: the BFF asserts the scope server-side and answers 403, so a hand-crafted fetch gains nothing.
