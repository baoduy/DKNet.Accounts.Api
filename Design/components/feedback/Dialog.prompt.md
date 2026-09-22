The modal behind every guarded write. Esc and backdrop click close it.

```jsx
<Dialog title="Close this account?" onClose={cancel} footer={<>
  <Button onClick={cancel}>Cancel</Button>
  <Button variant="destructive" style={{marginLeft:'auto'}} onClick={confirm}>Close account</Button>
</>}>
  <RefusalAlert errors={[{ code: 'ACCOUNT_HOLDS_BALANCE', message: 'This account still holds a balance. Current balance: 12,400.00 SGD' }]} />
</Dialog>
```

A dialog that states a consequence must state it in words, not echo the form — see `ConfirmMovement`. Where the service would refuse, render the refusal inside the dialog with the offending records listed, so the next step is visible without leaving the screen.
