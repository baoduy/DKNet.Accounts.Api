The pager at the foot of a table card.

```jsx
<Pagination position="bottom"
  page={page} pageCount={Math.ceil(total / pageSize)}
  pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
```

Rows per page on the left, `Page 2 of 7` and four round steppers on the right — first, previous, next, last. At either end the steppers disable rather than disappear, so the row keeps its width as the user walks the pages. A cursor-paged route that cannot know its page count passes `canPrevious`/`canNext` to override the page-derived enablement.

`Pagination` **is** a `CardBar` — do not wrap it in one. It renders the bar itself, so it
shares the filter bar's inset, vertical rhythm and hairline by construction rather than by
two files happening to agree. `position` decides which edge carries the hairline.
