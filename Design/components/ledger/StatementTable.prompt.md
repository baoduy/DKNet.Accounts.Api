The statement table — stream order, no sorting, reversal lineage visible in both directions.

```jsx
<Card padded={false}>
  <CardBar>
    <h2>Postings</h2>
    <Note>Stream order — this table does not sort. <b>Balance after</b> is the balance at that point in the stream.</Note>
  </CardBar>
  <StatementTable rows={postings} decimalPlaces={2} postingHref={r => '/postings/' + r.id} onSelectRow={setSelected} />
  <Pagination position="bottom" page={1} pageCount={7} pageSize={10} onPageChange={setPage} />
</Card>
```

A row with `status: 'Reversed'` gets a struck amount, a Reversed badge beside the posting number, and a muted balance-after. The reversal row itself carries a *Reverses POST-…* link back — both directions, always; a correction that can only be read forwards is half a record.

Empty states are three distinct messages: *No postings recorded on this account.* / *No postings between 1 Jan and 31 Jan.* + Clear dates / *No more postings.* + Back to first page.
