const {
  AppShell, Sidebar, PageHeader, UserMenu, Card, CardBar, Pagination, LedgerTable, Button, Icon, Chip,
  StatusBadge, Label, Caption, Note, Mono, Breadcrumb, Input, Select, Checkbox, MetadataEditor, AccountNumber,
  FilterMenu, FilterField,
  Money, Currency, BalanceTiles, FloorLine, DetailPanel, DetailList, DetailSection, Dialog,
  RefusalAlert, ReadOnlyField
} = window.DKNetAccountsDesignSystem_97519d;

const NAV = [
  { title: 'LEDGER', items: [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard', href: '../overview/index.html' },
    { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '#' },
    { id: 'records', label: 'Records', icon: 'file-text', href: '../records-crud/index.html' }
  ] },
  { title: 'ADMINISTRATION', pinToBottom: true, items: [
    { id: 'groups', label: 'Account groups', icon: 'folder', href: '../account-groups-crud/index.html' },
    { id: 'currencies', label: 'Currencies', icon: 'coins', href: '../currencies-crud/index.html' }
  ] }
];

const GROUPS = ['ACME', 'MERCH', 'SUSP', 'TREAS', 'FEES'];
const CURRENCIES = { SGD: 2, USD: 2, JPY: 0, KWD: 3, USDC: 6, IDR: 0 };
const CLASSIFICATIONS = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const dec = (code) => (code in CURRENCIES ? CURRENCIES[code] : 2);

const SEED = [
  { id: 'a1', accountNumber: 'ACME-000123', groupId: 'ACME', name: 'Operating account', currency: 'SGD', classification: 'liability', permittedToGoNegative: false, overdraftLimit: '', minimumBalance: '0', externalReference: 'erp:acme-op-01', metadata: [{ key: 'region', value: 'apac' }, { key: 'tier', value: 'enterprise' }], status: 'Active', balance: 12400, availableBalance: 12400, heldAmount: 0, openedOn: '18 Sep 2026' },
  { id: 'a2', accountNumber: 'MERCH-000044', groupId: 'MERCH', name: 'Settlement — APAC', currency: 'SGD', classification: 'liability', permittedToGoNegative: true, overdraftLimit: '50000', minimumBalance: '', externalReference: null, metadata: [{ key: 'corridor', value: 'sg-my' }], status: 'Active', balance: -1820.4, availableBalance: -1820.4, heldAmount: 0, openedOn: '14 Sep 2026' },
  { id: 'a3', accountNumber: 'SUSP-000002', groupId: 'SUSP', name: 'Suspense — unmatched', currency: 'SGD', classification: 'asset', permittedToGoNegative: false, overdraftLimit: '', minimumBalance: '', externalReference: null, metadata: [], status: 'Frozen', balance: 1204.55, availableBalance: 1204.55, heldAmount: 0, openedOn: '12 Sep 2026' },
  { id: 'a4', accountNumber: 'TREAS-000007', groupId: 'TREAS', name: 'Treasury — USD nostro', currency: 'USD', classification: 'asset', permittedToGoNegative: true, overdraftLimit: '250000', minimumBalance: '', externalReference: 'swift:nostro-usd', metadata: [{ key: 'desk', value: 'usd' }], status: 'Active', balance: 984210.06, availableBalance: 984210.06, heldAmount: 0, openedOn: '02 Sep 2026' },
  { id: 'a5', accountNumber: 'ACME-000124', groupId: 'ACME', name: 'Payroll — JPY', currency: 'JPY', classification: 'liability', permittedToGoNegative: false, overdraftLimit: '', minimumBalance: '100000', externalReference: null, metadata: [], status: 'Dormant', balance: 4200000, availableBalance: 4200000, heldAmount: 0, openedOn: '28 Aug 2026' },
  { id: 'a6', accountNumber: 'FEES-000003', groupId: 'FEES', name: 'Fee income — cards', currency: 'SGD', classification: 'revenue', permittedToGoNegative: false, overdraftLimit: '', minimumBalance: '', externalReference: null, metadata: [{ key: 'product', value: 'cards' }], status: 'Active', balance: 0, availableBalance: 0, heldAmount: 0, openedOn: '26 Aug 2026' },
  { id: 'a7', accountNumber: 'TREAS-000008', groupId: 'TREAS', name: 'Treasury — KWD', currency: 'KWD', classification: 'asset', permittedToGoNegative: false, overdraftLimit: '', minimumBalance: '', externalReference: null, metadata: [], status: 'Active', balance: 18.442, availableBalance: 18.442, heldAmount: 0, openedOn: '19 Aug 2026' },
  { id: 'a8', accountNumber: 'MERCH-000045', groupId: 'MERCH', name: 'Settlement — retired corridor', currency: 'USD', classification: 'liability', permittedToGoNegative: false, overdraftLimit: '', minimumBalance: '', externalReference: null, metadata: [{ key: 'closedBy', value: 'usr_4f21c8' }], status: 'Closed', balance: 0, availableBalance: 0, heldAmount: 0, openedOn: '11 Aug 2026' }
];

const BLANK = {
  groupId: '', accountNumber: null, name: '', currency: '', classification: 'asset',
  permittedToGoNegative: true, overdraftLimit: '', minimumBalance: '', externalReference: null, metadata: []
};

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

function Locked({ children }) {
  return (
    <ReadOnlyField>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{children}<Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span>
    </ReadOnlyField>
  );
}

const scaleOf = (v) => (String(v).split('.')[1] || '').length;

function AccountsScreen() {
  const [accounts, setAccounts] = React.useState(SEED);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [dialog, setDialog] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
  const [groupFilter, setGroupFilter] = React.useState('Any');
  const [currencyFilter, setCurrencyFilter] = React.useState('Any');
  const [statusFilter, setStatusFilter] = React.useState('Any');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState({ field: 'accountNumber', desc: false });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const errorRef = React.useRef(null);

  React.useEffect(() => {
    if (!errors.length) return;
    let p = errorRef.current && errorRef.current.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [errors]);

  const selected = accounts.find((a) => a.id === selectedId) || null;
  const original = mode === 'edit' && selected ? selected : BLANK;
  const dirty = draft ? JSON.stringify({ ...original, id: 0 }) !== JSON.stringify({ ...draft, id: 0 }) : false;

  const rows = accounts
    .filter((a) => (groupFilter === 'Any' || a.groupId === groupFilter)
      && (currencyFilter === 'Any' || a.currency === currencyFilter)
      && (statusFilter === 'Any' || a.status === statusFilter)
      && (query.trim() === '' || (a.accountNumber + ' ' + a.name + ' ' + (a.externalReference || '')).toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => {
      const dir = sort.desc ? -1 : 1;
      const x = a[sort.field], y = b[sort.field];
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });

  React.useEffect(() => { setPage(1); }, [groupFilter, currencyFilter, statusFilter, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);

  const set = (part) => setDraft((d) => ({ ...d, ...part }));
  const closePanel = () => {
    if (mode !== 'view' && dirty) { setDialog({ kind: 'discard' }); return; }
    setMode(null); setDraft(null); setErrors([]); setSelectedId(null);
  };
  const discard = () => { setDialog(null); setMode(null); setDraft(null); setErrors([]); setSelectedId(null); };

  const openView = (a) => { setSelectedId(a.id); setMode('view'); setDraft(null); setErrors([]); };
  const openEdit = (a) => { setSelectedId(a.id); setDraft({ ...a, metadata: a.metadata.map((m) => ({ ...m })) }); setMode('edit'); setErrors([]); };
  const openCreate = () => { setSelectedId(null); setDraft({ ...BLANK, metadata: [] }); setMode('create'); setErrors([]); };

  const save = () => {
    const found = [];
    const dp = dec(draft.currency);
    const limit = String(draft.overdraftLimit || '').trim();
    const floorMin = String(draft.minimumBalance || '').trim();
    if (!draft.groupId) found.push({ message: 'Group is required — an account is always opened inside a group.', code: 'ACCOUNT_GROUP_REQUIRED' });
    if (!(draft.name || '').trim()) found.push({ message: 'Name is required.', code: 'ACCOUNT_NAME_REQUIRED' });
    if (!draft.currency) found.push({ message: 'Currency is required and cannot be changed after the account is opened.', code: 'ACCOUNT_CURRENCY_REQUIRED' });
    if (CLASSIFICATIONS.indexOf(draft.classification) === -1) found.push({ message: 'Classification takes one of: ' + CLASSIFICATIONS.join(', ') + '.', code: 'INVALID_CLASSIFICATION' });
    if (draft.permittedToGoNegative) {
      if (limit === '') found.push({ message: 'Overdraft limit is required when the account is permitted to go negative — it is the floor.', code: 'OVERDRAFT_LIMIT_REQUIRED' });
      else if (!/^\d+(\.\d+)?$/.test(limit)) found.push({ message: 'Overdraft limit takes a positive decimal amount, written unsigned.', code: 'INVALID_OVERDRAFT_LIMIT' });
      else if (scaleOf(limit) > dp) found.push({ message: 'Overdraft limit carries ' + scaleOf(limit) + ' decimal places; ' + (draft.currency || 'this currency') + ' is stored at ' + dp + '.', code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY' });
    } else if (limit !== '') {
      found.push({ message: 'An overdraft limit cannot be set while the account is not permitted to go negative.', code: 'OVERDRAFT_LIMIT_NOT_PERMITTED' });
    }
    if (floorMin !== '') {
      if (!/^-?\d+(\.\d+)?$/.test(floorMin)) found.push({ message: 'Minimum balance takes a decimal amount.', code: 'INVALID_MINIMUM_BALANCE' });
      else if (scaleOf(floorMin) > dp) found.push({ message: 'Minimum balance carries ' + scaleOf(floorMin) + ' decimal places; ' + (draft.currency || 'this currency') + ' is stored at ' + dp + '.', code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY' });
      else if (!draft.permittedToGoNegative && Number(floorMin) < 0) found.push({ message: 'Minimum balance cannot be negative while the account is not permitted to go negative.', code: 'MINIMUM_BALANCE_BELOW_ZERO' });
    }
    if (found.length) { setErrors(found); return; }
    setErrors([]);
    if (mode === 'create') {
      const seq = accounts.reduce((m, a) => (a.groupId === draft.groupId ? Math.max(m, Number(a.accountNumber.split('-')[1]) || 0) : m), 0) + 1;
      const created = {
        ...draft,
        id: 'a' + (accounts.length + 1),
        accountNumber: draft.groupId + '-' + String(1000000 + seq).slice(1),
        name: draft.name.trim(),
        status: 'Active', balance: 0, availableBalance: 0, heldAmount: 0, openedOn: '22 Sep 2026'
      };
      setAccounts((as) => [created, ...as]);
      setSelectedId(created.id);
      setFlash({ title: 'Account opened', text: 'Opened ' + created.accountNumber + ' in ' + created.currency + ' at a zero balance. The account number was assigned by the service and is permanent.' });
    } else {
      setAccounts((as) => as.map((a) => (a.id === draft.id ? {
        ...a,
        name: draft.name.trim(),
        classification: draft.classification,
        permittedToGoNegative: draft.permittedToGoNegative,
        overdraftLimit: draft.overdraftLimit,
        minimumBalance: draft.minimumBalance,
        metadata: draft.metadata
      } : a)));
      setFlash({ title: 'Changes saved', text: 'Updated ' + draft.accountNumber + '. Group, account number, currency and external reference are unchanged; no posting was made.' });
    }
    setMode('view');
    setDraft(null);
  };

  const archive = (a) => {
    setAccounts((as) => as.map((x) => (x.id === a.id ? { ...x, status: 'Closed' } : x)));
    setDialog(null);
    setFlash({ title: 'Account closed', text: a.accountNumber + ' is closed. Its statement stays readable; no posting can be recorded against it.' });
  };

  const mono = (v) => <Mono>{v}</Mono>;
  const columns = [
    { key: 'accountNumber', header: 'Account no.', sortable: true, render: (r) => <AccountNumber value={r.accountNumber} href={'../account-detail/index.html?account=' + r.accountNumber} style={{ fontWeight: 'var(--weight-semibold)' }} /> },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'groupId', header: 'Group', sortable: true, render: (r) => mono(r.groupId) },
    { key: 'classification', header: 'Classification', sortable: true, render: (r) => <Chip>{r.classification}</Chip> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'balance', header: 'Balance', sortable: true, align: 'right', render: (r) => <Money amount={r.balance} decimalPlaces={dec(r.currency)} /> },
    { key: 'availableBalance', header: 'Available', sortable: false, align: 'right', render: (r) => <Money amount={r.availableBalance} decimalPlaces={dec(r.currency)} /> },
    { key: 'currency', header: 'Currency', sortable: true, queryAs: 'CurrencyCode', render: (r) => <Currency code={r.currency} /> },
    { key: 'openedOn', header: 'Opened', sortable: false, align: 'right', render: (r) => <Caption>{r.openedOn}</Caption> }
  ];

  const holdsBalance = selected ? Number(selected.balance) !== 0 : false;
  const panelOpen = mode !== null;
  const panel = (
    <DetailPanel
      open={panelOpen}
      onClose={closePanel}
      title={mode === 'create' ? 'Open account' : mode === 'edit' ? 'Edit ' + (draft ? draft.accountNumber : '') : selected
        ? <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span><Mono>{selected.accountNumber}</Mono></span>
          <span style={{ fontSize: 'var(--text-table-size)', fontWeight: 'var(--weight-regular)', color: 'var(--muted-foreground)' }}>{selected.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}><Chip>{selected.classification}</Chip><StatusBadge status={selected.status} /></span>
        </span>
        : ''}
      footnote={mode === 'view'
        ? (selected && holdsBalance && selected.status !== 'Closed'
          ? <>Balance is <Money amount={selected.balance} decimalPlaces={dec(selected.currency)} /> — closing is refused with <Mono>ACCOUNT_HOLDS_BALANCE</Mono>.</>
          : null)
        : mode === 'edit'
          ? 'Group, account number, currency and external reference are fixed once the account is open. Name, classification, the floor policy and metadata can be corrected.'
          : 'The account number is assigned by the service on open. Group, currency and external reference cannot be changed afterwards.'}
      actions={mode === 'view'
        ? (selected ? (
          <>
            {selected.status === 'Closed'
              ? <Button size="sm" variant="primary" onClick={() => setAccounts((as) => as.map((x) => (x.id === selected.id ? { ...x, status: 'Active' } : x)))}>Reopen account</Button>
              : <Button size="sm" variant="destructive" disabled={holdsBalance} onClick={() => setDialog({ kind: 'close', account: selected })}>Close account</Button>}
            <Button size="sm" variant="primary" onClick={() => openEdit(selected)}>Edit account</Button>
          </>
        ) : null)
        : (
          <>
            <Button size="sm" onClick={closePanel}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={save}>{mode === 'create' ? 'Open account' : 'Save changes'}</Button>
          </>
        )}
    >
      {mode === 'view' && selected ? (
        <>
          <DetailSection divider={false} style={{ marginTop: 0 }}>Balances</DetailSection>
          <BalanceTiles layout="inline" account={{ balance: selected.balance, availableBalance: selected.availableBalance, heldAmount: selected.heldAmount, currency: selected.currency, decimalPlaces: dec(selected.currency) }} />
          <Note style={{ marginTop: 'var(--space-3)' }}>Balance, available and held are three values and are never combined into one.</Note>
          <DetailSection>Identity</DetailSection>
          <DetailList items={[
            { label: 'Account no.', value: mono(selected.accountNumber) },
            { label: 'Name', value: selected.name },
            { label: 'Group', value: mono(selected.groupId) },
            { label: 'Currency', value: <span><Currency code={selected.currency} /> <Caption>{dec(selected.currency)} dp</Caption></span> },
            { label: 'Classification', value: selected.classification }
          ]} />
          <DetailSection>Floor policy</DetailSection>
          <DetailList items={[
            { label: 'May go negative', value: selected.permittedToGoNegative ? 'Yes' : 'No' },
            { label: 'Overdraft limit', value: selected.overdraftLimit === '' || selected.overdraftLimit === null
              ? <Caption>Not set.</Caption>
              : <Money amount={selected.overdraftLimit} decimalPlaces={dec(selected.currency)} /> },
            { label: 'Minimum balance', value: selected.minimumBalance === '' || selected.minimumBalance === null
              ? <Caption>Not set.</Caption>
              : <Money amount={selected.minimumBalance} decimalPlaces={dec(selected.currency)} /> }
          ]} />
          <FloorLine style={{ marginTop: 'var(--space-3)' }} account={{ permittedToGoNegative: selected.permittedToGoNegative, overdraftLimit: selected.overdraftLimit === '' ? null : selected.overdraftLimit, minimumBalance: selected.minimumBalance === '' ? null : selected.minimumBalance, currency: selected.currency, decimalPlaces: dec(selected.currency) }} />
          {selected.metadata.length ? (
            <>
              <DetailSection>Metadata</DetailSection>
              <MetadataEditor readOnly entries={selected.metadata} />
            </>
          ) : null}
          <DetailSection>Audit</DetailSection>
          <DetailList items={[
            { label: 'External ref.', value: selected.externalReference ? mono(selected.externalReference) : <Caption>Not set.</Caption> },
            { label: 'Opened', value: selected.openedOn }
          ]} />
        </>
      ) : draft ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr)', gap: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-table-size)' }}>
            <FormRow label="Group" required hint={mode === 'create' ? 'The group code becomes the prefix of the account number.' : null}>
              {mode === 'edit'
                ? <Locked><Mono>{draft.groupId}</Mono></Locked>
                : <Select options={[{ value: '', label: 'Select a group' }].concat(GROUPS.map((g) => ({ value: g, label: g })))} value={draft.groupId} onChange={(e) => set({ groupId: e.target.value })} style={{ width: '100%' }} />}
            </FormRow>
            <FormRow label="Account no.">
              {mode === 'edit'
                ? <Locked><Mono>{draft.accountNumber}</Mono></Locked>
                : <ReadOnlyField><Caption>Assigned by the service on open{draft.groupId ? ' — ' + draft.groupId + '-000###' : ''}.</Caption></ReadOnlyField>}
            </FormRow>
            <FormRow label="Name" required>
              <Input value={draft.name} placeholder="Operating account" invalid={errors.some((e) => e.code === 'ACCOUNT_NAME_REQUIRED')} onChange={(e) => set({ name: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Currency" required hint={mode === 'create' ? 'Fixed once the account is open. Every amount on it is stored at this currency\u2019s scale.' : null}>
              {mode === 'edit'
                ? <Locked><Mono>{draft.currency}</Mono></Locked>
                : <Select options={[{ value: '', label: 'Select a currency' }].concat(Object.keys(CURRENCIES).map((c) => ({ value: c, label: c + ' — ' + CURRENCIES[c] + ' dp' })))} value={draft.currency} onChange={(e) => set({ currency: e.target.value })} style={{ width: '100%' }} />}
            </FormRow>
            <FormRow label="Classification" required>
              <Select options={CLASSIFICATIONS} value={draft.classification} onChange={(e) => set({ classification: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Floor policy" hint={draft.permittedToGoNegative
              ? 'An overdraft limit is required while this is on — the floor is \u2212limit.'
              : 'The floor is the minimum balance, or zero when none is set.'}>
              <Checkbox checked={draft.permittedToGoNegative} onChange={(e) => set({ permittedToGoNegative: e.target.checked, overdraftLimit: e.target.checked ? draft.overdraftLimit : '' })} label="Permitted to go negative" />
            </FormRow>
            <FormRow label="Overdraft limit" required={draft.permittedToGoNegative} hint={draft.permittedToGoNegative ? 'Unsigned. ' + (draft.currency ? draft.currency + ' at ' + dec(draft.currency) + ' decimal places.' : 'At the currency\u2019s scale.') : null}>
              {draft.permittedToGoNegative
                ? <Input numeric value={draft.overdraftLimit} placeholder="50000.00" invalid={errors.some((e) => e.code.indexOf('OVERDRAFT') > -1)} onChange={(e) => set({ overdraftLimit: e.target.value })} style={{ width: 160 }} aria-label="Overdraft limit" />
                : <ReadOnlyField><Caption>Unavailable while the account may not go negative.</Caption></ReadOnlyField>}
            </FormRow>
            <FormRow label="Minimum balance" hint="Optional. Sent as null when left empty.">
              <Input numeric value={draft.minimumBalance} placeholder="0.00" invalid={errors.some((e) => e.code.indexOf('MINIMUM') > -1)} onChange={(e) => set({ minimumBalance: e.target.value })} style={{ width: 160 }} aria-label="Minimum balance" />
            </FormRow>
            <FormRow label="External ref." hint={mode === 'create' ? 'Optional. The calling system\u2019s own identifier. Sent as null when left empty.' : null}>
              {mode === 'edit'
                ? <Locked>{draft.externalReference ? <Mono>{draft.externalReference}</Mono> : <Caption>Not set.</Caption>}</Locked>
                : <Input mono value={draft.externalReference || ''} placeholder="erp:acme-op-01" onChange={(e) => set({ externalReference: e.target.value === '' ? null : e.target.value })} style={{ width: '100%' }} />}
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
        sidebar={<Sidebar sections={NAV} active="accounts" />}
        topbarRight={<UserMenu name="Steven Ho" email="steven.ho@transwap.com" tenant="Transwap" objectId="8f2c41de-90a1-4c33-b0f2-77e5a1c9d412" scopes={['accounts.read', 'accounts.write', 'postings.read', 'postings.write']} missingScopes={['postings.reverse']} onSignOut={() => {}} />}
        breadcrumb={<Breadcrumb items={[{ label: 'Ledger', href: '#' }, { label: 'Accounts' }]} />}
        panel={panel}
        panelOpen={panelOpen}
        style={{ minWidth: 1180 }}
      >
        <PageHeader
          icon="wallet"
          title="Accounts"
          description="Every account sits in one group, is denominated in one currency, and carries its own floor policy."
          actions={
            <>
              <Button icon={<Icon name="download" size={14} />} onClick={() => setFlash({ title: 'Export queued', text: rows.length + ' accounts will be written to CSV and mailed to you when ready.' })}>Export</Button>
              <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={openCreate}>Open account</Button>
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
            <Input placeholder="Search number, name or reference" prefix={<Icon name="search" size={14} />} value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 272 }} aria-label="Search accounts" />
            {query ? <Button size="sm" variant="ghost" onClick={() => setQuery('')} style={{ color: 'var(--muted-foreground)' }}>Clear</Button> : null}
            <Caption style={{ marginLeft: 'auto' }}>{rows.length} of {accounts.length}</Caption>
            <FilterMenu activeCount={(groupFilter !== 'Any' ? 1 : 0) + (currencyFilter !== 'Any' ? 1 : 0) + (statusFilter !== 'Any' ? 1 : 0)} onClear={() => { setGroupFilter('Any'); setCurrencyFilter('Any'); setStatusFilter('Any'); }}>
              <FilterField label="Group">
                <Select options={['Any'].concat(GROUPS)} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
              <FilterField label="Currency">
                <Select options={['Any'].concat(Object.keys(CURRENCIES))} value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
              <FilterField label="Status">
                <Select options={['Any', 'Active', 'Dormant', 'Frozen', 'Closed']} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%' }} />
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
            emptyMessage="No accounts match this filter."
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
        <Note>An account number is a link — it opens that account's page, with its records and its floor. Available and Opened carry no sort control: both are computed on the entity, so <Mono>orderBy</Mono> on either answers 400. Balances are reported per currency and are never combined into a single total.</Note>
      </AppShell>

      <Dialog
        open={Boolean(dialog && dialog.kind === 'close')}
        tone="destructive"
        title="Close account"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Keep account open</Button>
            <Button variant="destructive" onClick={() => archive(dialog.account)}>Close account</Button>
          </>
        }
      >
        {dialog && dialog.account ? (
          <>
            <div>Closing <Mono>{dialog.account.accountNumber}</Mono> stops any further posting against it. Its statement and its {dialog.account.metadata.length ? 'metadata' : 'history'} stay readable.</div>
            <Note style={{ marginTop: 'var(--space-3)' }}>Reversible — a closed account can be reopened from this panel. Nothing in the ledger is erased either way.</Note>
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

ReactDOM.createRoot(document.getElementById('root')).render(<AccountsScreen />);
