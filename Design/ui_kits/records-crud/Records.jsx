const {
  AppShell, Sidebar, PageHeader, UserMenu, Card, CardBar, Pagination, LedgerTable, Button, Icon, Chip,
  StatusBadge, Badge, Label, Caption, Note, Mono, Breadcrumb, Input, Select, Textarea, MetadataEditor,
  IdempotencyKeyField, Money, Currency, AccountNumber, DetailPanel, DetailList, DetailSection,
  Dialog, ConfirmMovement, RefusalAlert, ReadOnlyField, FilterMenu, FilterField
} = window.DKNetAccountsDesignSystem_97519d;

const NAV = [
  { title: 'LEDGER', items: [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard', href: '../overview/index.html' },
    { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '../accounts-crud/index.html' },
    { id: 'records', label: 'Records', icon: 'file-text', href: '#' }
  ] },
  { title: 'ADMINISTRATION', pinToBottom: true, items: [
    { id: 'groups', label: 'Account groups', icon: 'folder', href: '../account-groups-crud/index.html' },
    { id: 'currencies', label: 'Currencies', icon: 'coins', href: '../currencies-crud/index.html' }
  ] }
];

const CURRENCIES = { SGD: 2, USD: 2, JPY: 0, KWD: 3, USDC: 6, IDR: 0 };
const dec = (code) => (code in CURRENCIES ? CURRENCIES[code] : 2);

const ACCOUNTS = [
  { id: 'a1', accountNumber: 'ACME-000123', name: 'Operating account', currency: 'SGD', status: 'Active', balance: 12400, permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '0' },
  { id: 'a2', accountNumber: 'MERCH-000044', name: 'Settlement — APAC', currency: 'SGD', status: 'Active', balance: -1820.4, permittedToGoNegative: true, overdraftLimit: '50000', minimumBalance: null },
  { id: 'a3', accountNumber: 'SUSP-000002', name: 'Suspense — unmatched', currency: 'SGD', status: 'Frozen', balance: 1204.55, permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null },
  { id: 'a4', accountNumber: 'TREAS-000007', name: 'Treasury — USD nostro', currency: 'USD', status: 'Active', balance: 984210.06, permittedToGoNegative: true, overdraftLimit: '250000', minimumBalance: null },
  { id: 'a5', accountNumber: 'ACME-000124', name: 'Payroll — JPY', currency: 'JPY', status: 'Dormant', balance: 4200000, permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '100000' },
  { id: 'a6', accountNumber: 'FEES-000003', name: 'Fee income — cards', currency: 'SGD', status: 'Active', balance: 0, permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null }
];
const accountOf = (id) => ACCOUNTS.find((a) => a.id === id) || null;

const CATEGORIES = ['transfer', 'fee', 'adjustment', 'settlement', 'interest', 'reversal'];
const TODAY = '2026-09-22';

const SEED = [
  { id: 'r1', recordNumber: 'PST-0000918', accountId: 'a1', direction: 'credit', amount: '4200.00', currency: 'SGD', effectiveDate: '2026-09-21', category: 'transfer', description: 'Inbound customer transfer, batch 4471.', counterpartyAccountId: 'a4', counterpartyReference: 'swift:MT103-88213', transactionGroupId: 'tgr_88f102', externalReference: 'erp:pay-4471', metadata: [{ key: 'channel', value: 'swift' }], recordedBy: 'usr_4f21c8', recordedAt: '21 Sep 2026 09:14:22 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r2', recordNumber: 'PST-0000919', accountId: 'a1', direction: 'debit', amount: '18.50', currency: 'SGD', effectiveDate: '2026-09-21', category: 'fee', description: 'Transfer fee, batch 4471.', counterpartyAccountId: 'a6', counterpartyReference: null, transactionGroupId: 'tgr_88f102', externalReference: null, metadata: [], recordedBy: 'usr_4f21c8', recordedAt: '21 Sep 2026 09:14:22 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r3', recordNumber: 'PST-0000920', accountId: 'a2', direction: 'debit', amount: '1820.40', currency: 'SGD', effectiveDate: '2026-09-20', category: 'settlement', description: 'Corridor SG–MY settlement, cycle 208.', counterpartyAccountId: null, counterpartyReference: 'cycle:208', transactionGroupId: null, externalReference: null, metadata: [{ key: 'corridor', value: 'sg-my' }], recordedBy: 'svc_settlement', recordedAt: '20 Sep 2026 23:05:01 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r4', recordNumber: 'PST-0000921', accountId: 'a4', direction: 'credit', amount: '120000.00', currency: 'USD', effectiveDate: '2026-09-19', category: 'transfer', description: null, counterpartyAccountId: null, counterpartyReference: 'nostro:funding', transactionGroupId: null, externalReference: 'trs:fund-0912', metadata: [], recordedBy: 'usr_1b77a0', recordedAt: '19 Sep 2026 14:41:08 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r5', recordNumber: 'PST-0000922', accountId: 'a1', direction: 'debit', amount: '950.00', currency: 'SGD', effectiveDate: '2026-09-18', category: 'adjustment', description: 'Manual adjustment, later corrected.', counterpartyAccountId: null, counterpartyReference: null, transactionGroupId: null, externalReference: null, metadata: [], recordedBy: 'usr_9a30de', recordedAt: '18 Sep 2026 11:02:40 UTC', status: 'Reversed', reversedBy: 'PST-0000923', reverses: null, reversalReason: 'Amount applied twice — duplicate of PST-0000918.' },
  { id: 'r6', recordNumber: 'PST-0000923', accountId: 'a1', direction: 'credit', amount: '950.00', currency: 'SGD', effectiveDate: '2026-09-18', category: 'reversal', description: 'Reverses PST-0000922 — amount applied twice.', counterpartyAccountId: null, counterpartyReference: null, transactionGroupId: null, externalReference: null, metadata: [], recordedBy: 'usr_9a30de', recordedAt: '18 Sep 2026 11:06:12 UTC', status: 'Posted', reversedBy: null, reverses: 'PST-0000922' },
  { id: 'r7', recordNumber: 'PST-0000924', accountId: 'a5', direction: 'credit', amount: '4200000', currency: 'JPY', effectiveDate: '2026-09-15', category: 'transfer', description: 'Payroll pre-fund, September cycle.', counterpartyAccountId: 'a4', counterpartyReference: null, transactionGroupId: 'tgr_71aa93', externalReference: null, metadata: [{ key: 'cycle', value: '2026-09' }], recordedBy: 'svc_payroll', recordedAt: '15 Sep 2026 02:00:07 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r8', recordNumber: 'PST-0000925', accountId: 'a6', direction: 'credit', amount: '18.50', currency: 'SGD', effectiveDate: '2026-09-14', category: 'fee', description: 'Fee recognition, batch 4470.', counterpartyAccountId: 'a1', counterpartyReference: null, transactionGroupId: null, externalReference: null, metadata: [], recordedBy: 'svc_billing', recordedAt: '14 Sep 2026 09:30:11 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r9', recordNumber: 'PST-0000926', accountId: 'a3', direction: 'credit', amount: '1204.55', currency: 'SGD', effectiveDate: '2026-09-12', category: 'adjustment', description: 'Unmatched inbound, held pending attribution.', counterpartyAccountId: null, counterpartyReference: 'ref:unmatched-88', transactionGroupId: null, externalReference: null, metadata: [], recordedBy: 'svc_ingest', recordedAt: '12 Sep 2026 17:22:55 UTC', status: 'Posted', reversedBy: null, reverses: null }
];

const BLANK = {
  accountId: '', direction: 'credit', amount: '', currency: '', effectiveDate: TODAY,
  category: 'transfer', description: null, counterpartyAccountId: null, counterpartyReference: null,
  transactionGroupId: null, externalReference: null, metadata: []
};

/* The authenticated caller. The API's auth layer stamps recordedBy from the token, so it is
   never a form field — it is shown back on the record. */
const CALLER = 'usr_4f21c8';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso, withYear = true) {
  if (!iso) return '—';
  const p = iso.split('-');
  return p[2].replace(/^0/, '') + ' ' + MONTHS[Number(p[1]) - 1] + (withYear ? ' ' + p[0] : '');
}
const scaleOf = (v) => (String(v).split('.')[1] || '').length;
const mintKey = () => 'idm_' + Math.random().toString(16).slice(2, 10) + '-' + Math.random().toString(16).slice(2, 6) + '-' + Date.now().toString(16).slice(-6);

function floorOf(a) {
  if (!a) return null;
  if (a.permittedToGoNegative) return a.overdraftLimit === null || a.overdraftLimit === '' ? null : -Number(a.overdraftLimit);
  return a.minimumBalance === null || a.minimumBalance === '' ? 0 : Number(a.minimumBalance);
}

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

const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' }
];
const PERIOD_FROM = { '7d': '2026-09-15', '14d': '2026-09-08', '30d': '2026-08-23', '90d': '2026-06-24' };

function RecordsScreen() {
  const [records, setRecords] = React.useState(SEED);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [idemKey, setIdemKey] = React.useState(mintKey);
  const [dialog, setDialog] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const [reasonError, setReasonError] = React.useState(false);
  const [flash, setFlash] = React.useState(null);
  const [directionFilter, setDirectionFilter] = React.useState('Any');
  const [categoryFilter, setCategoryFilter] = React.useState('Any');
  const [statusFilter, setStatusFilter] = React.useState('Any');
  const [period, setPeriod] = React.useState('30d');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState({ field: 'recordNumber', desc: true });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const errorRef = React.useRef(null);

  React.useEffect(() => {
    if (!errors.length) return;
    let p = errorRef.current && errorRef.current.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [errors]);

  const selected = records.find((r) => r.id === selectedId) || null;
  const dirty = draft ? JSON.stringify({ ...BLANK, id: 0 }) !== JSON.stringify({ ...draft, id: 0 }) : false;
  const draftAccount = draft ? accountOf(draft.accountId) : null;

  const rows = records
    .filter((r) => (directionFilter === 'Any' || r.direction === directionFilter)
      && (categoryFilter === 'Any' || r.category === categoryFilter)
      && (statusFilter === 'Any' || r.status === statusFilter)
      && r.effectiveDate >= PERIOD_FROM[period]
      && (query.trim() === '' || [r.recordNumber, (accountOf(r.accountId) || {}).accountNumber, r.description || '', r.transactionGroupId || '', r.counterpartyReference || '', r.externalReference || ''].join(' ').toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => {
      const dir = sort.desc ? -1 : 1;
      const x = sort.field === 'amount' ? Number(a.amount) : a[sort.field];
      const y = sort.field === 'amount' ? Number(b.amount) : b[sort.field];
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });

  React.useEffect(() => { setPage(1); }, [directionFilter, categoryFilter, statusFilter, period, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);

  const set = (part) => setDraft((d) => ({ ...d, ...part }));
  const closePanel = () => {
    if (mode === 'create' && dirty) { setDialog({ kind: 'discard' }); return; }
    setMode(null); setDraft(null); setErrors([]); setSelectedId(null);
  };
  const discard = () => { setDialog(null); setMode(null); setDraft(null); setErrors([]); setSelectedId(null); };

  const openView = (r) => { setSelectedId(r.id); setMode('view'); setDraft(null); setErrors([]); };
  const openCreate = () => { setSelectedId(null); setDraft({ ...BLANK, metadata: [] }); setMode('create'); setErrors([]); setIdemKey(mintKey()); };

  const validate = () => {
    const found = [];
    const account = accountOf(draft.accountId);
    const amount = String(draft.amount || '').trim();
    const dp = account ? dec(account.currency) : 2;
    if (!account) found.push({ message: 'Account is required — a record is always posted against one account.', code: 'ACCOUNT_REQUIRED' });
    else if (account.status === 'Frozen' || account.status === 'Closed') found.push({ message: account.accountNumber + ' is ' + account.status.toLowerCase() + '. No record can be posted against it.', code: 'ACCOUNT_NOT_POSTABLE' });
    else if (account.status === 'Dormant' && draft.direction === 'debit') found.push({ message: 'Debits are disabled: this account is dormant. A credit can still be recorded.', code: 'DEBIT_NOT_PERMITTED' });
    if (amount === '') found.push({ message: 'Amount is required.', code: 'AMOUNT_REQUIRED' });
    else if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) === 0) found.push({ message: 'Amount takes a positive decimal, written unsigned — the direction carries the sign.', code: 'INVALID_AMOUNT' });
    else if (account && scaleOf(amount) > dp) found.push({ message: 'Amount carries ' + scaleOf(amount) + ' decimal places; ' + account.currency + ' is stored at ' + dp + '.', code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY' });
    if (draft.effectiveDate && draft.effectiveDate > TODAY) found.push({ message: 'Effective date cannot be in the future.', code: 'EFFECTIVE_DATE_IN_FUTURE' });
    if (account && draft.direction === 'debit' && /^\d+(\.\d+)?$/.test(amount)) {
      const floor = floorOf(account);
      const after = Number(account.balance) - Number(amount);
      if (floor !== null && after < floor) {
        found.push({ message: 'This debit would take ' + account.accountNumber + ' to ' + after.toFixed(dp) + ', below its floor of ' + floor.toFixed(dp) + ' ' + account.currency + '.', code: 'INSUFFICIENT_FUNDS' });
      }
    }
    setErrors(found);
    return found.length === 0;
  };

  const record = () => {
    const account = accountOf(draft.accountId);
    const created = {
      ...draft,
      id: 'r' + (records.length + 1),
      recordNumber: 'PST-' + String(10000918 + records.length).slice(1),
      currency: account.currency,
      amount: String(draft.amount).trim(),
      recordedAt: '22 Sep 2026 10:12:44 UTC',
      recordedBy: CALLER,
      status: 'Posted', reversedBy: null, reverses: null
    };
    setRecords((rs) => [created, ...rs]);
    setSelectedId(created.id);
    setMode('view');
    setDraft(null);
    setDialog(null);
    setIdemKey(mintKey());
    setFlash({ title: 'Record posted', text: created.recordNumber + ' — ' + (created.direction === 'credit' ? 'credit' : 'debit') + ' of ' + created.amount + ' ' + created.currency + ' against ' + account.accountNumber + ', effective ' + fmtDate(created.effectiveDate) + '. A new idempotency key has been minted for the next record.' });
  };

  const reverse = (r, why) => {
    const account = accountOf(r.accountId);
    const counter = {
      ...r,
      id: 'r' + (records.length + 1),
      recordNumber: 'PST-' + String(10000918 + records.length).slice(1),
      direction: r.direction === 'credit' ? 'debit' : 'credit',
      category: 'reversal',
      description: 'Reverses ' + r.recordNumber + ' — ' + why + '',
      metadata: [], externalReference: null, transactionGroupId: r.transactionGroupId,
      recordedAt: '22 Sep 2026 10:12:44 UTC', recordedBy: CALLER, status: 'Posted', reversedBy: null, reverses: r.recordNumber, reversalReason: why
    };
    setRecords((rs) => [counter].concat(rs.map((x) => (x.id === r.id ? { ...x, status: 'Reversed', reversedBy: counter.recordNumber, reversalReason: why } : x))));
    setDialog(null);
    setReason('');
    setReasonError(false);
    setSelectedId(counter.id);
    setMode('view');
    setFlash({ title: 'Record reversed', text: counter.recordNumber + ' was recorded as the opposing entry and ' + r.recordNumber + ' is marked Reversed. Nothing was erased — ' + (account ? account.accountNumber : 'the account') + ' now carries both rows.' });
  };

  const mono = (v) => <Mono>{v}</Mono>;
  const columns = [
    { key: 'recordNumber', header: 'Record no.', sortable: true, render: (r) => <Mono style={{ fontWeight: 'var(--weight-semibold)' }}>{r.recordNumber}</Mono> },
    { key: 'accountId', header: 'Account', sortable: true, render: (r) => {
      const a = accountOf(r.accountId);
      return a
        ? <AccountNumber value={a.accountNumber} href={'../account-detail/index.html?account=' + a.accountNumber} />
        : <Mono>{r.accountId}</Mono>;
    } },
    { key: 'direction', header: 'Direction', sortable: true, render: (r) => <Badge tone={r.direction === 'credit' ? 'credit' : 'debit'}>{r.direction}</Badge> },
    { key: 'category', header: 'Category', sortable: true, render: (r) => <Chip>{r.category}</Chip> },
    { key: 'amount', header: 'Amount', sortable: true, align: 'right', render: (r) => <Money amount={r.direction === 'debit' ? '-' + r.amount : r.amount} decimalPlaces={dec(r.currency)} signed struck={r.status === 'Reversed'} /> },
    { key: 'currency', header: 'Currency', sortable: true, queryAs: 'CurrencyCode', render: (r) => <Currency code={r.currency} /> },
    { key: 'effectiveDate', header: 'Effective', sortable: true, align: 'right', render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(r.effectiveDate)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'recordedBy', header: 'Recorded by', sortable: false, render: (r) => <Caption><Mono>{r.recordedBy}</Mono></Caption> }
  ];

  const reversible = selected ? selected.status === 'Posted' && !selected.reverses : false;
  const panelOpen = mode !== null;
  const panel = (
    <DetailPanel
      open={panelOpen}
      onClose={closePanel}
      title={mode === 'create' ? 'Record posting' : selected
        ? <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span><Mono>{selected.recordNumber}</Mono></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}><Chip>{selected.category}</Chip><StatusBadge status={selected.status} /></span>
        </span>
        : ''}
      footnote={mode === 'create'
        ? null
        : selected
          ? (selected.status === 'Reversed'
            ? <>Already reversed by <Mono>{selected.reversedBy}</Mono> — reversing again is refused with <Mono>POSTING_ALREADY_REVERSED</Mono>.</>
            : selected.reverses
              ? <>This record is itself a reversal of <Mono>{selected.reverses}</Mono>. Reversing a reversal is refused with <Mono>POSTING_IS_REVERSAL</Mono>.</>
              : 'Records are immutable. Reversing records an opposing entry; it does not edit or delete this row.')
          : null}
      actions={mode === 'create'
        ? (
          <>
            <Button size="sm" onClick={closePanel}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={() => { if (validate()) setDialog({ kind: 'confirm' }); }}>Review movement</Button>
          </>
        )
        : (selected ? (
          <Button size="sm" variant="destructive" disabled={!reversible} icon={<Icon name="rotate-ccw" size={14} />} onClick={() => { setReason(''); setReasonError(false); setDialog({ kind: 'reverse', record: selected }); }}>Reverse</Button>
        ) : null)}
    >
      {mode === 'view' && selected ? (
        <>
          <DetailSection divider={false} style={{ marginTop: 0 }}>Movement</DetailSection>
          <DetailList items={[
            { label: 'Direction', value: <Badge tone={selected.direction === 'credit' ? 'credit' : 'debit'}>{selected.direction}</Badge> },
            { label: 'Amount', value: <Money amount={selected.direction === 'debit' ? '-' + selected.amount : selected.amount} currency={selected.currency} decimalPlaces={dec(selected.currency)} signed showCurrency struck={selected.status === 'Reversed'} /> },
            { label: 'Account', value: mono((accountOf(selected.accountId) || {}).accountNumber || selected.accountId) },
            { label: 'Effective', value: fmtDate(selected.effectiveDate) },
            { label: 'Category', value: selected.category }
          ]} />
          <DetailSection>References</DetailSection>
          <DetailList items={[
            { label: 'Description', value: selected.description || <Caption>Not set.</Caption> },
            { label: 'Counterparty', value: selected.counterpartyAccountId
              ? mono((accountOf(selected.counterpartyAccountId) || {}).accountNumber || selected.counterpartyAccountId)
              : <Caption>Not set.</Caption> },
            { label: 'Counterparty ref.', value: selected.counterpartyReference ? mono(selected.counterpartyReference) : <Caption>Not set.</Caption> },
            { label: 'Transaction group', value: selected.transactionGroupId ? mono(selected.transactionGroupId) : <Caption>Not set.</Caption> },
            { label: 'External ref.', value: selected.externalReference ? mono(selected.externalReference) : <Caption>Not set.</Caption> }
          ]} />
          {selected.metadata.length ? (
            <>
              <DetailSection>Metadata</DetailSection>
              <MetadataEditor readOnly entries={selected.metadata} />
            </>
          ) : null}
          {selected.reversedBy || selected.reverses ? (
            <>
              <DetailSection>Reversal lineage</DetailSection>
              <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: 'var(--space-3)', fontSize: 'var(--text-table-size)' }}>
                {selected.reversedBy
                  ? <>Reversed by <Mono>{selected.reversedBy}</Mono>. Both rows stay on the account; the balance reflects the pair.</>
                  : <>Reverses <Mono>{selected.reverses}</Mono>. This is the correcting entry, not a deletion.</>}
                {selected.reversalReason ? <div style={{ marginTop: 'var(--space-2)', color: 'var(--muted-foreground)' }}>Reason: {selected.reversalReason}</div> : null}
              </div>
            </>
          ) : null}
          <DetailSection>Audit</DetailSection>
          <DetailList items={[
            { label: 'Recorded by', value: mono(selected.recordedBy) },
            { label: 'Recorded', value: selected.recordedAt }
          ]} />
        </>
      ) : draft ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-table-size)' }}>
            <FormRow label="Account" required hint={draftAccount && draftAccount.status !== 'Active'
              ? draftAccount.accountNumber + ' is ' + draftAccount.status.toLowerCase() + '.'
              : 'The account fixes the currency and the floor this record is checked against.'}>
              <Select
                options={[{ value: '', label: 'Select an account' }].concat(ACCOUNTS.map((a) => ({ value: a.id, label: a.accountNumber + ' — ' + a.name })))}
                value={draft.accountId}
                onChange={(e) => set({ accountId: e.target.value, currency: (accountOf(e.target.value) || {}).currency || '' })}
                style={{ width: '100%' }}
              />
            </FormRow>
            <FormRow label="Currency">
              <ReadOnlyField>
                {draftAccount
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Currency code={draftAccount.currency} /><Caption>{dec(draftAccount.currency)} dp</Caption><Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span>
                  : <Caption>Taken from the account.</Caption>}
              </ReadOnlyField>
            </FormRow>
            <FormRow label="Direction" required hint={draftAccount && draftAccount.status === 'Dormant' ? 'Debits are disabled: this account is dormant. A credit can still be recorded.' : null}>
              <Select options={[{ value: 'credit', label: 'Credit' }, { value: 'debit', label: 'Debit' }]} value={draft.direction} onChange={(e) => set({ direction: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Amount" required hint={draftAccount
              ? 'Unsigned, at ' + dec(draftAccount.currency) + ' decimal places. Balance is now ' + Number(draftAccount.balance).toFixed(dec(draftAccount.currency)) + ' ' + draftAccount.currency + '.'
              : 'Unsigned — the direction carries the sign.'}>
              <Input numeric value={draft.amount} placeholder="0.00" invalid={errors.some((e) => e.code.indexOf('AMOUNT') > -1 || e.code === 'INSUFFICIENT_FUNDS')} onChange={(e) => set({ amount: e.target.value })} style={{ width: 168 }} aria-label="Amount" />
            </FormRow>
            <FormRow label="Effective" hint="Defaults to today. Future dates are blocked here rather than refused by the service.">
              <Input type="date" value={draft.effectiveDate || ''} max={TODAY} invalid={errors.some((e) => e.code === 'EFFECTIVE_DATE_IN_FUTURE')} onChange={(e) => set({ effectiveDate: e.target.value === '' ? null : e.target.value })} style={{ width: 168 }} aria-label="Effective date" />
            </FormRow>
            <FormRow label="Category" required>
              <Select options={CATEGORIES} value={draft.category} onChange={(e) => set({ category: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Description" hint="Optional. Sent as null when left empty.">
              <Textarea rows={2} value={draft.description || ''} placeholder="What this record is for." onChange={(e) => set({ description: e.target.value === '' ? null : e.target.value })} />
            </FormRow>
          </div>
          <DetailSection>Counterparty and grouping</DetailSection>
          <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-table-size)' }}>
            <FormRow label="Counterparty">
              <Select options={[{ value: '', label: 'None' }].concat(ACCOUNTS.filter((a) => a.id !== draft.accountId).map((a) => ({ value: a.id, label: a.accountNumber })))} value={draft.counterpartyAccountId || ''} onChange={(e) => set({ counterpartyAccountId: e.target.value === '' ? null : e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Counterparty ref." hint="The other side's own identifier, where there is no account in this ledger.">
              <Input mono value={draft.counterpartyReference || ''} placeholder="swift:MT103-88213" onChange={(e) => set({ counterpartyReference: e.target.value === '' ? null : e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Transaction group" hint="Ties records that move together. Left empty, this record stands alone.">
              <Input mono value={draft.transactionGroupId || ''} placeholder="tgr_88f102" onChange={(e) => set({ transactionGroupId: e.target.value === '' ? null : e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="External ref.">
              <Input mono value={draft.externalReference || ''} placeholder="erp:pay-4471" onChange={(e) => set({ externalReference: e.target.value === '' ? null : e.target.value })} style={{ width: '100%' }} />
            </FormRow>
          </div>
          <DetailSection>Metadata</DetailSection>
          <MetadataEditor entries={draft.metadata} onChange={(entries) => set({ metadata: entries })} />
          <Note style={{ marginTop: 'var(--space-3)' }}>String keys and values only.</Note>
          <div style={{ marginTop: 'var(--space-5)' }}><IdempotencyKeyField value={idemKey} /></div>
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
        sidebar={<Sidebar sections={NAV} active="records" />}
        topbarRight={<UserMenu name="Steven Ho" email="steven.ho@transwap.com" tenant="Transwap" objectId="8f2c41de-90a1-4c33-b0f2-77e5a1c9d412" scopes={['accounts.read', 'accounts.write', 'postings.read', 'postings.write']} missingScopes={['postings.reverse']} onSignOut={() => {}} />}
        breadcrumb={<Breadcrumb items={[{ label: 'Ledger', href: '#' }, { label: 'Records' }]} />}
        panel={panel}
        panelOpen={panelOpen}
        style={{ minWidth: 1180 }}
      >
        <PageHeader
          icon="file-text"
          title="Records"
          description="Every movement recorded against an account. A record is immutable once posted; a correction is an opposing record."
          actions={
            <>
              <Button icon={<Icon name="download" size={14} />} onClick={() => setFlash({ title: 'Export queued', text: rows.length + ' records will be written to CSV and mailed to you when ready.' })}>Export</Button>
              <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={openCreate}>Record posting</Button>
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
            <Input placeholder="Search record, account or reference" prefix={<Icon name="search" size={14} />} value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 256 }} aria-label="Search records" />
            {query ? <Button size="sm" variant="ghost" onClick={() => setQuery('')} style={{ color: 'var(--muted-foreground)' }}>Clear</Button> : null}
            <Caption style={{ marginLeft: 'auto' }}>{rows.length} of {records.length}</Caption>
            <FilterMenu activeCount={(period !== '30d' ? 1 : 0) + (directionFilter !== 'Any' ? 1 : 0) + (categoryFilter !== 'Any' ? 1 : 0) + (statusFilter !== 'Any' ? 1 : 0)} onClear={() => { setPeriod('30d'); setDirectionFilter('Any'); setCategoryFilter('Any'); setStatusFilter('Any'); }}>
              <FilterField label="Period" hint="Effective date. 90 days is the widest window.">
                <Select options={PERIODS} value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
              <FilterField label="Direction">
                <Select options={['Any', 'credit', 'debit']} value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
              <FilterField label="Category">
                <Select options={['Any'].concat(CATEGORIES)} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
              <FilterField label="Status">
                <Select options={['Any', 'Posted', 'Reversed']} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%' }} />
              </FilterField>
            </FilterMenu>
          </CardBar>
          <LedgerTable
            columns={columns}
            rows={visible}
            selectedId={selectedId}
            onSelectRow={(r) => (mode === 'create' && dirty ? setDialog({ kind: 'discard' }) : openView(r))}
            orderBy={sort.field}
            desc={sort.desc}
            onSort={(field) => setSort((s) => ({ field, desc: s.field === field ? !s.desc : true }))}
            emptyMessage="No records match this filter."
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
        <Note>Amounts are shown at each currency's own precision and are never combined across currencies. <Mono>Balance after</Mono> is a property of one account's stream and appears on that account's statement, not in this cross-account list.</Note>
      </AppShell>

      {dialog && dialog.kind === 'confirm' && draft && draftAccount ? (
        <ConfirmMovement
          open
          direction={draft.direction === 'credit' ? 'Credit' : 'Debit'}
          amount={draft.amount}
          currency={draftAccount.currency}
          decimalPlaces={dec(draftAccount.currency)}
          accountNumber={draftAccount.accountNumber}
          accountName={draftAccount.name}
          effectiveDate={fmtDate(draft.effectiveDate)}
          category={draft.category}
          consequence="Posting is immediate and final. The record cannot be edited afterwards; a correction is recorded as an opposing record."
          onBack={() => setDialog(null)}
          onConfirm={record}
          confirmLabel="Record posting"
        />
      ) : null}

      {dialog && dialog.kind === 'reverse-confirm' && dialog.record ? (
        <ConfirmMovement
          open
          direction={dialog.record.direction === 'credit' ? 'Debit' : 'Credit'}
          amount={dialog.record.amount}
          currency={dialog.record.currency}
          decimalPlaces={dec(dialog.record.currency)}
          accountNumber={(accountOf(dialog.record.accountId) || {}).accountNumber}
          accountName={(accountOf(dialog.record.accountId) || {}).name}
          effectiveDate={fmtDate(dialog.record.effectiveDate)}
          category="reversal"
          consequence={<>A new opposing record is posted and <Mono>{dialog.record.recordNumber}</Mono> is marked Reversed. Nothing is erased — the account carries both rows. Reason: {reason.trim()}</>}
          onBack={() => setDialog({ kind: 'reverse', record: dialog.record })}
          onConfirm={() => reverse(dialog.record, reason.trim())}
          confirmLabel="Reverse record"
        />
      ) : null}

      <Dialog
        open={Boolean(dialog && dialog.kind === 'reverse')}
        tone="destructive"
        title="Reverse record"
        onClose={() => { setDialog(null); setReasonError(false); }}
        footer={
          <>
            <Button onClick={() => { setDialog(null); setReasonError(false); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (!reason.trim()) { setReasonError(true); return; } setReasonError(false); setDialog({ kind: 'reverse-confirm', record: dialog.record }); }}>Continue</Button>
          </>
        }
      >
        {dialog && dialog.record ? (
          <>
            <div>Reversing <Mono>{dialog.record.recordNumber}</Mono> posts an opposing entry against <Mono>{(accountOf(dialog.record.accountId) || {}).accountNumber}</Mono>. Nothing is erased.</div>
            <Caption style={{ display: 'block', marginTop: 'var(--space-4)' }}>Reason<span aria-hidden="true" style={{ color: 'var(--destructive-solid)', marginLeft: 2 }}>*</span></Caption>
            <Textarea rows={3} value={reason} invalid={reasonError} placeholder="Why this record is being reversed." onChange={(e) => { setReason(e.target.value); if (e.target.value.trim()) setReasonError(false); }} style={{ marginTop: 6 }} />
            <Note style={{ marginTop: 'var(--space-3)' }}>Required. Stored on both records and shown in the reversal lineage — this is the audit trail for the correction.</Note>
            {reasonError ? <RefusalAlert errors={[{ message: 'A reason is required to reverse a record.', code: 'REVERSAL_REASON_REQUIRED' }]} style={{ marginTop: 'var(--space-3)' }} /> : null}
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(dialog && dialog.kind === 'discard')}
        title="Discard unsent record?"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Keep editing</Button>
            <Button variant="destructive" onClick={discard}>Discard record</Button>
          </>
        }
      >
        This record has not been sent. Closing the panel drops it, and the idempotency key is
        discarded with it.
      </Dialog>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<RecordsScreen />);
