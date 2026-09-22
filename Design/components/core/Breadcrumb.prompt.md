The trail in the top bar of every detail screen.

```jsx
<Breadcrumb items={[
  { label: 'Groups', href: '/groups' },
  { label: 'ACME', href: '/groups/acme' },
  { label: 'ACME-000123' }
]} />
```

The last crumb is the current page and renders bold in `--foreground`, never as a link. Separator is a plain slash at 13px.
