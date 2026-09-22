The last step before money moves. Required on record, batch and reverse.

```jsx
<ConfirmMovement direction="Debit" amount={12400} currency="SGD" decimalPlaces={2}
  accountNumber="ACME-000123" accountName="Operating Account"
  effectiveDate="21 Sep 2026" category="Transfer"
  onBack={back} onConfirm={submit} />

<ConfirmMovement direction="Credit" amount={892.45} currency="SGD"
  accountNumber="ACME-000123" confirmLabel="Reverse posting"
  consequence="A new opposing posting will be recorded; the original is marked Reversed. Nothing is deleted."
  onBack={back} onConfirm={reverse} />
```

Restate, never echo. In batch mode pass `legs` — every leg is listed and the dialog says all-or-nothing before submit.
