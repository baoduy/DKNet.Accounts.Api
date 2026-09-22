Monospace, copy-on-click identifiers for accounts and postings.

```jsx
<AccountNumber value="ACME-000123" href="/accounts/acme-000123" />
<PostingNumber value="POST-000123" href="/postings/123" reversed />
```

Without `href` or `onNavigate` the click copies the value — account and posting numbers are what get pasted into tickets. Inside a table row, a linked identifier navigates while the rest of the row opens the detail panel; keep both behaviours.
