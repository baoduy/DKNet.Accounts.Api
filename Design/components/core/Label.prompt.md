The four text roles the console repeats everywhere, so they are not re-styled by hand each time.

```jsx
<Label>BALANCE</Label>
<Caption>18 Sep 09:02</Caption>
<Note>Balances are reported per currency and are never combined into a single total.</Note>
<Mono>ACME-000123</Mono>
```

`Note` is load-bearing in this console: refusal reasons, the not-summed line under group balances, and the "this table does not sort" line are all Notes. `Mono` is for anything compared by eye — identifiers, codes, and refusal codes quoted in prose.
