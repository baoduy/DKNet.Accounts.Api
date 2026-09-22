The frame every console screen sits in.

```jsx
<AppShell
  sidebar={<Sidebar active="accounts" onNavigate={go} />}
  breadcrumb={<Breadcrumb items={[{label:'Accounts',href:'#'},{label:'ACME-000123'}]} />}
  topbarRight={<Input placeholder="Search accounts, postings…  ⌘K" prefix={<Icon name="search" />} style={{width:230}} />}
  panelOpen={!!selected}
  panel={<DetailPanel open={!!selected} … />}>
  <PageHeader … />
  <Card>…</Card>
</AppShell>
```

24px body padding, 20px between stacked sections, a 48px top bar on the card surface. The shell owns the panel behaviour: by default the panel slides in over the right edge of the content, which stays put. Pass `panelBehavior="shift"` with `panelOpen` to push the content left by `--drawer-width` instead.
