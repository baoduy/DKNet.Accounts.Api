const {
  AppShell, Sidebar, PageHeader, UserMenu, Card, CardBar, Pagination, LedgerTable, Button, Icon, Chip,
  StatusBadge, Label, Caption, Note, Mono, Breadcrumb, Input, Select, Textarea, MetadataEditor,
  DetailPanel, DetailList, DetailSection, Dialog, RefusalAlert, ReadOnlyField,
  FilterMenu, FilterField
} = window.DKNetAccountsDesignSystem_97519d;

const NAV = [
  { title: 'LEDGER', items: [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard', href: '../overview/index.html' },
    { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '../accounts-crud/index.html' },
    { id: 'records', label: 'Records', icon: 'file-text', href: '../records-crud/index.html' }
  ] },
  { title: 'ADMINISTRATION', pinToBottom: true, items: [
    { id: 'groups', label: 'Account groups', icon: 'folder', href: '#' },
    { id: 'currencies', label: 'Currencies', icon: 'coins', href: '../currencies-crud/index.html' }
  ] }
];

const TYPES = ['customer', 'internal', 'suspense', 'settlement'];

const SEED = [
  { id: 'g1', code: 'ACME', name: 'Acme Corporation', description: 'Customer funds held for Acme and its subsidiaries.', type: 'customer', ownerId: 'usr_4f21c8', metadata: [{ key: 'region', value: 'apac' }, { key: 'tier', value: 'enterprise' }], status: 'Active', accounts: 14, holdsBalance: true, createdOn: '18 Sep 2026' },
  { id: 'g2', code: 'MERCH', name: 'Merchant settlement', description: 'Settlement accounts per acquiring corridor.', type: 'settlement', ownerId: 'usr_9a30de', metadata: [{ key: 'corridor', value: 'sg-my' }], status: 'Active', accounts: 6, holdsBalance: true, createdOn: '14 Sep 2026' },
  { id: 'g3', code: 'SUSP', name: 'Suspense — unmatched', description: 'Holding group for postings awaiting attribution.', type: 'suspense', ownerId: 'usr_4f21c8', metadata: [], status: 'Active', accounts: 2, holdsBalance: true, createdOn: '12 Sep 2026' },
  { id: 'g4', code: 'TREAS', name: 'Treasury', description: null, type: 'internal', ownerId: 'usr_1b77a0', metadata: [{ key: 'desk', value: 'sgd' }], status: 'Active', accounts: 9, holdsBalance: true, createdOn: '02 Sep 2026' },
  { id: 'g5', code: 'FEES', name: 'Fee income', description: 'Internal fee recognition accounts.', type: 'internal', ownerId: 'usr_1b77a0', metadata: [], status: 'Active', accounts: 3, holdsBalance: false, createdOn: '28 Aug 2026' },
  { id: 'g6', code: 'PILOT-01', name: 'Pilot — closed programme', description: 'Retired pilot programme. Retained for audit.', type: 'customer', ownerId: 'usr_9a30de', metadata: [{ key: 'closedBy', value: 'usr_4f21c8' }], status: 'Closed', accounts: 0, holdsBalance: false, createdOn: '11 Aug 2026' }
];

const BLANK = { code: '', name: '', description: null, type: 'customer', ownerId: '', metadata: [] };

/* The authenticated caller. The API's auth layer stamps the owner from the token, so it is
   never a form field — it is shown back on the group. */
const CALLER = 'usr_4f21c8';

function FormRow({ label, hint, required = false, children }) {
  return (
    <>
      <Caption style={{ paddingTop: 8 }}>{label}{required ? <span aria-hidden="true" style={{ color: 'var(--destructive-solid)', marginLeft: 2 }}>*</span> : null}</Caption>
      <div style={{ minWidth: 0 }}>
        {children}
        {hint ? <Note style={{ marginTop: 6 }}>{hint}</Note> : null}
      </div>
    </>
  );
}

function AccountGroupsScreen() {
  const [groups, setGroups] = React.useState(SEED);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [dialog, setDialog] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
  const [typeFilter, setTypeFilter] = React.useState('Any');
  const [statusFilter, setStatusFilter] = React.useState('Any');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState({ field: 'code', desc: false });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const errorRef = React.useRef(null);

  React.useEffect(() => {
    if (!errors.length) return;
    let p = errorRef.current && errorRef.current.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [errors]);

  const selected = groups.find((g) => g.id === selectedId) || null;
  const original = mode === 'edit' && selected ? selected : BLANK;
  const dirty = draft ? JSON.stringify({ ...original, id: 0 }) !== JSON.stringify({ ...draft, id: 0 }) : false;

  const rows = groups
    .filter((g) => (typeFilter === 'Any' || g.type === typeFilter)
      && (statusFilter === 'Any' || g.status === statusFilter)
      && (query.trim() === '' || (g.code + ' ' + g.name + ' ' + (g.description || '') + ' ' + g.ownerId).toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => {
      const dir = sort.desc ? -1 : 1;
      const x = a[sort.field], y = b[sort.field];
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });

  React.useEffect(() => { setPage(1); }, [typeFilter, statusFilter, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);

  const set = (part) => setDraft((d) => ({ ...d, ...part }));
  const closePanel = () => {
    if (mode !== 'view' && dirty) { setDialog({ kind: 'discard' }); return; }
    setMode(null); setDraft(null); setErrors([]); setSelectedId(null);
  };
  const discard = () => { setDialog(null); setMode(null); setDraft(null); setErrors([]); setSelectedId(null); };

  const openView = (g) => { setSelectedId(g.id); setMode('view'); setDraft(null); setErrors([]); };
  const openEdit = (g) => { setSelectedId(g.id); setDraft({ ...g, metadata: g.metadata.map((m) => ({ ...m })) }); setMode('edit'); setErrors([]); };
  const openCreate = () => { setSelectedId(null); setDraft({ ...BLANK, metadata: [] }); setMode('create'); setErrors([]); };

  const save = () => {
    const found = [];
    const code = (draft.code || '').trim();
    if (!code) found.push({ message: 'Code is required.', code: 'GROUP_CODE_REQUIRED' });
    else if (!/^[A-Z0-9-]{3,16}$/.test(code)) found.push({ message: 'Code takes 3–16 characters, upper case, digits and hyphens only.', code: 'INVALID_GROUP_CODE' });
    else if (mode === 'create' && groups.some((g) => g.code === code)) found.push({ message: 'Code ' + code + ' is already taken by an existing group.', code: 'GROUP_CODE_TAKEN' });
    if (!(draft.name || '').trim()) found.push({ message: 'Name is required.', code: 'GROUP_NAME_REQUIRED' });
    if (found.length) { setErrors(found); return; }
    setErrors([]);
    if (mode === 'create') {
      const created = { ...draft, code, ownerId: CALLER, id: 'g' + (groups.length + 1), status: 'Active', accounts: 0, holdsBalance: false, createdOn: '22 Sep 2026' };
      setGroups((gs) => [created, ...gs]);
      setSelectedId(created.id);
      setFlash({ title: 'Group created', text: 'Created ' + created.code + ' — ' + created.name + '. No accounts are open in it yet.' });
    } else {
      setGroups((gs) => gs.map((g) => (g.id === draft.id ? { ...draft } : g)));
      setFlash({ title: 'Changes saved', text: 'Updated ' + draft.code + '. Code and currency of existing accounts are unaffected.' });
    }
    setMode('view');
    setDraft(null);
  };

  const archive = (g) => {
    setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, status: 'Closed' } : x)));
    setDialog(null);
    setFlash({ title: 'Group closed', text: g.code + ' is closed. Existing accounts stay readable; no new account can be opened in it.' });
  };

  const mono = (v) => <Mono>{v}</Mono>;
  const columns = [
    { key: 'code', header: 'Code', sortable: true, render: (r) => <Mono style={{ fontWeight: 'var(--weight-semibold)' }}>{r.code}</Mono> },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'type', header: 'Type', sortable: true, render: (r) => <Chip>{r.type}</Chip> },
    { key: 'ownerId', header: 'Owner', sortable: true, render: (r) => mono(r.ownerId) },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'accounts', header: 'Accounts', sortable: false, align: 'right' },
    { key: 'createdOn', header: 'Created', sortable: false, align: 'right', render: (r) => <Caption>{r.createdOn}</Caption> }
  ];

  const panelOpen = mode !== null;
  const panel = (
    <DetailPanel
      open={panelOpen}
      onClose={closePanel}
      title={mode === 'create' ? 'New account group' : mode === 'edit' ? 'Edit ' + (draft ? draft.code || 'group' : '') : selected
        ? <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span>{selected.code + ' · ' + selected.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}><Chip>{selected.type}</Chip><StatusBadge status={selected.status} /></span>
        </span>
        : ''}
      footnote={mode === 'view'
        ? null
        : mode === 'edit' ? 'Code, type and owner are immutable after creation. Renaming does not touch account numbers.'
          : 'Code, type and owner are fixed once the group is created. The code becomes the prefix of every account number in it.'}
      actions={mode === 'view'
        ? (selected ? (
          <>
            {selected.status === 'Closed'
              ? <Button size="sm" variant="primary" onClick={() => setGroups((gs) => gs.map((x) => (x.id === selected.id ? { ...x, status: 'Active' } : x)))}>Reopen group</Button>
              : <Button size="sm" variant="destructive" disabled={selected.holdsBalance} onClick={() => setDialog({ kind: 'close', group: selected })}>Close group</Button>}
            <Button size="sm" variant="primary" onClick={() => openEdit(selected)}>Edit group</Button>
          </>
        ) : null)
        : (
          <>
            <Button size="sm" onClick={closePanel}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={save}>{mode === 'create' ? 'Create group' : 'Save changes'}</Button>
          </>
        )}
    >
      {mode === 'view' && selected ? (
        <>
          <DetailSection divider={false} style={{ marginTop: 0 }}>Details</DetailSection>
          <DetailList items={[
            { label: 'Code', value: mono(selected.code) },
            { label: 'Name', value: selected.name },
            { label: 'Description', value: selected.description ? selected.description : <Caption>Not set.</Caption> },
            { label: 'Owner', value: mono(selected.ownerId) }
          ]} />
          {selected.metadata.length ? (
            <>
              <DetailSection>Metadata</DetailSection>
              <MetadataEditor readOnly entries={selected.metadata} />
            </>
          ) : null}
          <DetailSection>Content</DetailSection>
          <DetailList items={[
            { label: 'Accounts', value: selected.accounts },
            { label: 'Created', value: selected.createdOn },
            { label: 'Balances', value: <Caption>Reported per currency on the group page, never combined into a single total.</Caption> }
          ]} />
        </>
      ) : draft ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr)', gap: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-table-size)' }}>
            <FormRow label="Code" required hint={mode === 'create' ? 'Upper case, digits and hyphens. Becomes the account-number prefix. Cannot be changed later.' : null}>
              {mode === 'edit'
                ? <ReadOnlyField><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mono>{draft.code}</Mono><Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span></ReadOnlyField>
                : <Input mono value={draft.code} placeholder="ACME" invalid={errors.some((e) => e.code.indexOf('CODE') > -1)} onChange={(e) => set({ code: e.target.value.toUpperCase() })} style={{ width: '100%' }} />}
            </FormRow>
            <FormRow label="Name" required>
              <Input value={draft.name} placeholder="Acme Corporation" invalid={errors.some((e) => e.code === 'GROUP_NAME_REQUIRED')} onChange={(e) => set({ name: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Type" required hint={mode === 'create' ? 'Fixed once the group is created.' : null}>
              {mode === 'edit'
                ? <ReadOnlyField><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{draft.type}<Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span></ReadOnlyField>
                : <Select options={TYPES} value={draft.type} onChange={(e) => set({ type: e.target.value })} style={{ width: '100%' }} />}
            </FormRow>
            <FormRow label="Description" hint="Optional. Sent as null when left empty.">
              <Textarea rows={3} value={draft.description || ''} placeholder="What this group holds." onChange={(e) => set({ description: e.target.value === '' ? null : e.target.value })} />
            </FormRow>
          </div>
          <DetailSection>Metadata</DetailSection>
          <MetadataEditor entries={draft.metadata} onChange={(entries) => set({ metadata: entries })} />
          <Note style={{ marginTop: 'var(--space-3)' }}>String keys and values only.</Note>
          <div ref={errorRef}>
            {errors.length ? <RefusalAlert errors={errors} style={{ marginTop: 'var(--space-4)' }} /> : null}
          </div>
        </>
      ) : null}
    </DetailPanel>
  );

  return (
    <>
      <AppShell
        sidebar={<Sidebar sections={NAV} active="groups" />}
        topbarRight={<UserMenu name="Steven Ho" email="steven.ho@transwap.com" tenant="Transwap" objectId="8f2c41de-90a1-4c33-b0f2-77e5a1c9d412" scopes={['accounts.read', 'accounts.write', 'postings.read', 'postings.write']} missingScopes={['postings.reverse']} onSignOut={() => {}} />}
        breadcrumb={<Breadcrumb items={[{ label: 'Administration', href: '#' }, { label: 'Account groups' }]} />}
        panel={panel}
        panelOpen={panelOpen}
        style={{ minWidth: 1180 }}
      >
        <PageHeader
          icon="folder"
          title="Account groups"
          description="The Group multiple bank accounts. The group's code is the prefix of account numbers."
          actions={
            <>
              <Button icon={<Icon name="download" size={14} />} onClick={() => setFlash({ title: 'Export queued', text: rows.length + ' groups will be written to CSV and mailed to you when ready.' })}>Export</Button>
              <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={openCreate}>New group</Button>
            </>
          }
        />

        {flash ? (
          <Card style={{ borderLeft: '3px solid var(--credit)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
            <div style={{ minWidth: 0 }}>
              <Label>{flash.title}</Label>
              <div style={{ marginTop: 6, fontSize: 'var(--text-table-size)' }}>{flash.text}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFlash(null)} style={{ marginLeft: 'auto', color: 'var(--muted-foreground)' }} aria-label="Dismiss"><Icon name="x" size={14} /></Button>
          </Card>
        ) : null}

        <Card padded={false}>
          <CardBar position="top">
            <Input placeholder="Search code, name or owner" prefix={<Icon name="search" size={14} />} value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 272 }} aria-label="Search account groups" />
            {query ? <Button size="sm" variant="ghost" onClick={() => setQuery('')} style={{ color: 'var(--muted-foreground)' }}>Clear</Button> : null}
            <Caption style={{ marginLeft: 'auto' }}>{rows.length} of {groups.length}</Caption>
            <FilterMenu activeCount={(typeFilter !== 'Any' ? 1 : 0) + (statusFilter !== 'Any' ? 1 : 0)} onClear={() => { setTypeFilter('Any'); setStatusFilter('Any'); }}>
              <FilterField label="Type">
                <Select options={['Any'].concat(TYPES)} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
              <FilterField label="Status">
                <Select options={['Any', 'Active', 'Closed']} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
            </FilterMenu>
          </CardBar>          <LedgerTable
            columns={columns}
            rows={visible}
            selectedId={selectedId}
            onSelectRow={(r) => (mode !== 'view' && mode !== null && dirty ? setDialog({ kind: 'discard' }) : openView(r))}
            orderBy={sort.field}
            desc={sort.desc}
            onSort={(field) => setSort((s) => ({ field, desc: s.field === field ? !s.desc : false }))}
            emptyMessage="No groups match this filter."
          />
          <Pagination
            page={current}
            pageCount={pageCount}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 25, 50]}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          />
        </Card>
      </AppShell>

      <Dialog
        open={Boolean(dialog && dialog.kind === 'close')}
        tone="destructive"
        title="Close Account Group"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Keep group open</Button>
            <Button variant="destructive" onClick={() => archive(dialog.group)}>Close group</Button>
          </>
        }
      >
        {dialog && dialog.group ? (
          <>
            <div>Closing <Mono>{dialog.group.code}</Mono> stops any new account being opened in it. The {dialog.group.accounts} account{dialog.group.accounts === 1 ? '' : 's'} already in the group stay readable and keep their balances.</div>
            <Note style={{ marginTop: 'var(--space-3)' }}>Reversible — a closed group can be reopened from this panel.</Note>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(dialog && dialog.kind === 'discard')}
        title="Discard unsaved changes?"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Keep editing</Button>
            <Button variant="destructive" onClick={discard}>Discard changes</Button>
          </>
        }
      >
        This form has edits that have not been sent. Closing the panel drops them.
      </Dialog>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AccountGroupsScreen />);
