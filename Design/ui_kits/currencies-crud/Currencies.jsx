const {
  AppShell, Sidebar, PageHeader, UserMenu, Card, CardBar, Pagination, LedgerTable, Button, Icon, Chip,
  StatusBadge, Label, Caption, Note, Mono, Breadcrumb, Input, Select, Textarea,
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
    { id: 'groups', label: 'Account groups', icon: 'folder', href: '../account-groups-crud/index.html' },
    { id: 'currencies', label: 'Currencies', icon: 'coins', href: '#' }
  ] }
];

const SEED = [
  { id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, status: 'Active', accounts: 41, holdsBalance: true, createdOn: '02 Jan 2026' },
  { id: 'c2', code: 'USD', name: 'United States Dollar', decimalPlaces: 2, status: 'Active', accounts: 36, holdsBalance: true, createdOn: '02 Jan 2026' },
  { id: 'c3', code: 'JPY', name: 'Japanese Yen', decimalPlaces: 0, status: 'Active', accounts: 8, holdsBalance: true, createdOn: '14 Feb 2026' },
  { id: 'c4', code: 'KWD', name: 'Kuwaiti Dinar', decimalPlaces: 3, status: 'Active', accounts: 2, holdsBalance: true, createdOn: '03 Mar 2026' },
  { id: 'c5', code: 'USDC', name: 'USD Coin', decimalPlaces: 6, status: 'Active', accounts: 5, holdsBalance: false, createdOn: '19 Jun 2026' },
  { id: 'c6', code: 'IDR', name: 'Indonesian Rupiah', decimalPlaces: 0, status: 'Active', accounts: 3, holdsBalance: false, createdOn: '28 Jul 2026' },
  { id: 'c7', code: 'ZWL', name: 'Zimbabwean Dollar', decimalPlaces: 2, status: 'Closed', accounts: 0, holdsBalance: false, createdOn: '11 Aug 2026' }
];

const BLANK = { code: '', name: '', decimalPlaces: '' };

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

function sample(dp) {
  const n = Number(dp);
  if (!Number.isFinite(n)) return '—';
  return n === 0 ? '1,250' : '1,250.' + '0'.repeat(n);
}

function CurrenciesScreen() {
  const [currencies, setCurrencies] = React.useState(SEED);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [dialog, setDialog] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
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

  const selected = currencies.find((c) => c.id === selectedId) || null;
  const original = mode === 'edit' && selected ? { ...selected, decimalPlaces: String(selected.decimalPlaces) } : BLANK;
  const dirty = draft ? JSON.stringify({ ...original, id: 0 }) !== JSON.stringify({ ...draft, id: 0 }) : false;

  const rows = currencies
    .filter((c) => (statusFilter === 'Any' || c.status === statusFilter)
      && (query.trim() === '' || (c.code + ' ' + c.name).toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => {
      const dir = sort.desc ? -1 : 1;
      const x = a[sort.field], y = b[sort.field];
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });

  React.useEffect(() => { setPage(1); }, [statusFilter, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);

  const set = (part) => setDraft((d) => ({ ...d, ...part }));
  const closePanel = () => {
    if (mode !== 'view' && dirty) { setDialog({ kind: 'discard' }); return; }
    setMode(null); setDraft(null); setErrors([]); setSelectedId(null);
  };
  const discard = () => { setDialog(null); setMode(null); setDraft(null); setErrors([]); setSelectedId(null); };

  const openView = (c) => { setSelectedId(c.id); setMode('view'); setDraft(null); setErrors([]); };
  const openEdit = (c) => { setSelectedId(c.id); setDraft({ ...c, decimalPlaces: String(c.decimalPlaces) }); setMode('edit'); setErrors([]); };
  const openCreate = () => { setSelectedId(null); setDraft({ ...BLANK }); setMode('create'); setErrors([]); };

  const save = () => {
    const found = [];
    const code = (draft.code || '').trim();
    const dp = String(draft.decimalPlaces).trim();
    if (!code) found.push({ message: 'Code is required.', code: 'CURRENCY_CODE_REQUIRED' });
    else if (!/^[A-Z]{3,6}$/.test(code)) found.push({ message: 'Code takes 3–6 upper-case letters — ISO 4217 for fiat, the ticker for digital assets.', code: 'INVALID_CURRENCY_CODE' });
    else if (mode === 'create' && currencies.some((c) => c.code === code)) found.push({ message: 'Code ' + code + ' is already registered.', code: 'CURRENCY_CODE_TAKEN' });
    if (!(draft.name || '').trim()) found.push({ message: 'Name is required.', code: 'CURRENCY_NAME_REQUIRED' });
    if (dp === '') found.push({ message: 'Decimal places is required — the ledger stores every amount as a minor unit at this scale.', code: 'DECIMAL_PLACES_REQUIRED' });
    else if (!/^\d+$/.test(dp) || Number(dp) > 8) found.push({ message: 'Decimal places takes a whole number between 0 and 8.', code: 'INVALID_DECIMAL_PLACES' });
    if (found.length) { setErrors(found); return; }
    setErrors([]);
    if (mode === 'create') {
      const created = { code, name: draft.name.trim(), decimalPlaces: Number(dp), id: 'c' + (currencies.length + 1), status: 'Active', accounts: 0, holdsBalance: false, createdOn: '22 Sep 2026' };
      setCurrencies((cs) => [created, ...cs]);
      setSelectedId(created.id);
      setFlash({ title: 'Currency registered', text: 'Registered ' + created.code + ' at ' + created.decimalPlaces + ' decimal place' + (created.decimalPlaces === 1 ? '' : 's') + '. Accounts can now be opened in it.' });
    } else {
      setCurrencies((cs) => cs.map((c) => (c.id === draft.id ? { ...c, name: draft.name.trim(), decimalPlaces: Number(dp) } : c)));
      setFlash({ title: 'Changes saved', text: 'Updated ' + draft.code + ' — name and ' + dp + ' decimal place' + (Number(dp) === 1 ? '' : 's') + '. Stored balances are unaffected.' });
    }
    setMode('view');
    setDraft(null);
  };

  const archive = (c) => {
    setCurrencies((cs) => cs.map((x) => (x.id === c.id ? { ...x, status: 'Closed' } : x)));
    setDialog(null);
    setFlash({ title: 'Currency closed', text: c.code + ' is closed. Existing balances stay readable; no new account can be opened in it.' });
  };

  const mono = (v) => <Mono>{v}</Mono>;
  const columns = [
    { key: 'code', header: 'Code', sortable: true, render: (r) => <Mono style={{ fontWeight: 'var(--weight-semibold)' }}>{r.code}</Mono> },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'decimalPlaces', header: 'Decimals', sortable: true, align: 'right', render: (r) => mono(r.decimalPlaces) },
    { key: 'minorUnit', header: 'Minor unit', sortable: false, align: 'right', render: (r) => <Caption><Mono>{sample(r.decimalPlaces)}</Mono></Caption> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'accounts', header: 'Accounts', sortable: false, align: 'right' },
    { key: 'createdOn', header: 'Created', sortable: false, align: 'right', render: (r) => <Caption>{r.createdOn}</Caption> }
  ];

  const panelOpen = mode !== null;
  const panel = (
    <DetailPanel
      open={panelOpen}
      onClose={closePanel}
      title={mode === 'create' ? 'New currency' : mode === 'edit' ? 'Edit ' + (draft ? draft.code || 'currency' : '') : selected
        ? <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span>{selected.code + ' · ' + selected.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}><Chip>{selected.decimalPlaces} dp</Chip><StatusBadge status={selected.status} /></span>
        </span>
        : ''}
      footnote={mode === 'view'
        ? null
        : mode === 'edit' ? 'Code is fixed after registration. Name and decimal places can be corrected.'
          : 'The code cannot be changed after registration.'}
      actions={mode === 'view'
        ? (selected ? (
          <>
            {selected.status === 'Closed'
              ? <Button size="sm" variant="primary" onClick={() => setCurrencies((cs) => cs.map((x) => (x.id === selected.id ? { ...x, status: 'Active' } : x)))}>Reopen currency</Button>
              : <Button size="sm" variant="destructive" disabled={selected.holdsBalance} onClick={() => setDialog({ kind: 'close', currency: selected })}>Close currency</Button>}
            <Button size="sm" variant="primary" onClick={() => openEdit(selected)}>Edit currency</Button>
          </>
        ) : null)
        : (
          <>
            <Button size="sm" onClick={closePanel}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={save}>{mode === 'create' ? 'Register currency' : 'Save changes'}</Button>
          </>
        )}
    >
      {mode === 'view' && selected ? (
        <>
          <DetailSection divider={false} style={{ marginTop: 0 }}>Details</DetailSection>
          <DetailList items={[
            { label: 'Code', value: mono(selected.code) },
            { label: 'Name', value: selected.name },
            { label: 'Decimal places', value: mono(selected.decimalPlaces) },
            { label: 'Minor unit', value: <span><Mono>{sample(selected.decimalPlaces)}</Mono> <Caption>= 1,250 {selected.code}</Caption></span> }
          ]} />
          <DetailSection>Usage</DetailSection>
          <DetailList items={[
            { label: 'Accounts', value: selected.accounts },
            { label: 'Created', value: selected.createdOn },
            { label: 'Balances', value: selected.holdsBalance
              ? <Caption>Accounts in this currency hold a balance, so it cannot be closed.</Caption>
              : <Caption>No account in this currency holds a balance.</Caption> }
          ]} />
          {selected.holdsBalance && selected.status === 'Active' ? (
            <Note style={{ marginTop: 'var(--space-3)' }}>CURRENCY_HOLDS_BALANCE — close is unavailable until every balance in {selected.code} is zero.</Note>
          ) : null}
        </>
      ) : draft ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr)', gap: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-table-size)' }}>
            <FormRow label="Code" required hint={mode === 'create' ? 'Upper-case letters only. ISO 4217 for fiat, the ticker for digital assets. Cannot be changed later.' : null}>
              {mode === 'edit'
                ? <ReadOnlyField><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mono>{draft.code}</Mono><Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span></ReadOnlyField>
                : <Input mono value={draft.code} placeholder="SGD" invalid={errors.some((e) => e.code.indexOf('CODE') > -1)} onChange={(e) => set({ code: e.target.value.toUpperCase() })} style={{ width: '100%' }} />}
            </FormRow>
            <FormRow label="Name" required hint={mode === 'edit' ? 'Display name only.' : null}>
              <Input value={draft.name} placeholder="Singapore Dollar" invalid={errors.some((e) => e.code === 'CURRENCY_NAME_REQUIRED')} onChange={(e) => set({ name: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Decimals" required hint={draft.decimalPlaces !== '' && /^\d+$/.test(String(draft.decimalPlaces)) && Number(draft.decimalPlaces) <= 8
              ? '1,250 ' + (draft.code || 'units') + ' is stored and shown as ' + sample(draft.decimalPlaces) + '.'
              : '0 to 8.'}>
              <Input mono value={draft.decimalPlaces} placeholder="2" invalid={errors.some((e) => e.code.indexOf('DECIMAL') > -1)} onChange={(e) => set({ decimalPlaces: e.target.value.replace(/[^0-9]/g, '') })} style={{ width: 96 }} aria-label="Decimal places" />
            </FormRow>
          </div>
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
        sidebar={<Sidebar sections={NAV} active="currencies" />}
        topbarRight={<UserMenu name="Steven Ho" email="steven.ho@transwap.com" tenant="Transwap" objectId="8f2c41de-90a1-4c33-b0f2-77e5a1c9d412" scopes={['accounts.read', 'accounts.write', 'postings.read', 'postings.write']} missingScopes={['postings.reverse']} onSignOut={() => {}} />}
        breadcrumb={<Breadcrumb items={[{ label: 'Administration', href: '#' }, { label: 'Currencies' }]} />}
        panel={panel}
        panelOpen={panelOpen}
        style={{ minWidth: 1180 }}
      >
        <PageHeader
          icon="coins"
          title="Currencies"
          description="Every account is denominated in one of these. The decimal places fix how amounts are stored and shown."
          actions={
            <>
              <Button icon={<Icon name="download" size={14} />} onClick={() => setFlash({ title: 'Export queued', text: rows.length + ' currencies will be written to CSV and mailed to you when ready.' })}>Export</Button>
              <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={openCreate}>New currency</Button>
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
            <Input placeholder="Search code or name" prefix={<Icon name="search" size={14} />} value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 272 }} aria-label="Search currencies" />
            {query ? <Button size="sm" variant="ghost" onClick={() => setQuery('')} style={{ color: 'var(--muted-foreground)' }}>Clear</Button> : null}
            <Caption style={{ marginLeft: 'auto' }}>{rows.length} of {currencies.length}</Caption>
            <FilterMenu activeCount={statusFilter !== 'Any' ? 1 : 0} onClear={() => { setStatusFilter('Any'); }}>
              <FilterField label="Status">
                <Select options={['Any', 'Active', 'Closed']} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
            </FilterMenu>
          </CardBar>
          <LedgerTable
            columns={columns}
            rows={visible}
            selectedId={selectedId}
            onSelectRow={(r) => (mode !== 'view' && mode !== null && dirty ? setDialog({ kind: 'discard' }) : openView(r))}
            orderBy={sort.field}
            desc={sort.desc}
            onSort={(field) => setSort((s) => ({ field, desc: s.field === field ? !s.desc : false }))}
            emptyMessage="No currencies match this filter."
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
        title="Close currency"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Keep currency open</Button>
            <Button variant="destructive" onClick={() => archive(dialog.currency)}>Close currency</Button>
          </>
        }
      >
        {dialog && dialog.currency ? (
          <>
            <div>Closing <Mono>{dialog.currency.code}</Mono> stops any new account being opened in it. The {dialog.currency.accounts} account{dialog.currency.accounts === 1 ? '' : 's'} already denominated in it stay readable and keep their balances.</div>
            <Note style={{ marginTop: 'var(--space-3)' }}>Reversible — a closed currency can be reopened from this panel.</Note>
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

ReactDOM.createRoot(document.getElementById('root')).render(<CurrenciesScreen />);
