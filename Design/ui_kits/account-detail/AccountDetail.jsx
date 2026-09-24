const {
  AppShell, Sidebar, PageHeader, UserMenu, Card, CardBar, Pagination, LedgerTable, Button, Icon, Chip,
  StatusBadge, Badge, Label, Caption, Note, Mono, Breadcrumb, Input, Select, Textarea, Checkbox, MetadataEditor,
  IdempotencyKeyField, Money, Currency, BalanceTiles, FloorLine, AccountNumber, DetailPanel,
  DetailList, DetailSection, Dialog, ConfirmMovement, RefusalAlert, ReadOnlyField,
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
    { id: 'currencies', label: 'Currencies', icon: 'coins', href: '../currencies-crud/index.html' }
  ] }
];

const CURRENCIES = { SGD: 2, USD: 2, JPY: 0, KWD: 3, USDC: 6, IDR: 0 };
const dec = (code) => (code in CURRENCIES ? CURRENCIES[code] : 2);
const CALLER = 'usr_4f21c8';
const CATEGORIES = ['transfer', 'fee', 'adjustment', 'settlement', 'interest', 'reversal'];
const CLASSIFICATIONS = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TODAY = '2026-09-22';

const ACCOUNTS = [
  { id: 'a1', accountNumber: 'ACME-000123', groupId: 'ACME', name: 'Operating account', currency: 'SGD', classification: 'liability', status: 'Active', balance: 12400, heldAmount: 0, permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '0', externalReference: 'erp:acme-op-01', metadata: [{ key: 'region', value: 'apac' }, { key: 'tier', value: 'enterprise' }], openedOn: '18 Sep 2026' },
  { id: 'a2', accountNumber: 'MERCH-000044', groupId: 'MERCH', name: 'Settlement — APAC', currency: 'SGD', classification: 'liability', status: 'Active', balance: -1820.4, heldAmount: 0, permittedToGoNegative: true, overdraftLimit: '50000', minimumBalance: null, externalReference: null, metadata: [{ key: 'corridor', value: 'sg-my' }], openedOn: '14 Sep 2026' },
  { id: 'a3', accountNumber: 'SUSP-000002', groupId: 'SUSP', name: 'Suspense — unmatched', currency: 'SGD', classification: 'asset', status: 'Frozen', balance: 1204.55, heldAmount: 0, permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null, externalReference: null, metadata: [], openedOn: '12 Sep 2026' },
  { id: 'a4', accountNumber: 'TREAS-000007', groupId: 'TREAS', name: 'Treasury — USD nostro', currency: 'USD', classification: 'asset', status: 'Active', balance: 984210.06, heldAmount: 0, permittedToGoNegative: true, overdraftLimit: '250000', minimumBalance: null, externalReference: 'swift:nostro-usd', metadata: [{ key: 'desk', value: 'usd' }], openedOn: '02 Sep 2026' },
  { id: 'a5', accountNumber: 'ACME-000124', groupId: 'ACME', name: 'Payroll — JPY', currency: 'JPY', classification: 'liability', status: 'Dormant', balance: 4200000, heldAmount: 0, permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '100000', externalReference: null, metadata: [], openedOn: '28 Aug 2026' },
  { id: 'a6', accountNumber: 'FEES-000003', groupId: 'FEES', name: 'Fee income — cards', currency: 'SGD', classification: 'revenue', status: 'Active', balance: 0, heldAmount: 0, permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null, externalReference: null, metadata: [{ key: 'product', value: 'cards' }], openedOn: '26 Aug 2026' }
];

const SEED = [
  { id: 'r1', recordNumber: 'PST-0000918', accountId: 'a1', direction: 'credit', amount: '4200.00', currency: 'SGD', effectiveDate: '2026-09-21', category: 'transfer', description: 'Inbound customer transfer, batch 4471.', counterpartyAccountId: 'a4', counterpartyReference: 'swift:MT103-88213', transactionGroupId: 'tgr_88f102', externalReference: 'erp:pay-4471', metadata: [{ key: 'channel', value: 'swift' }], recordedBy: 'usr_4f21c8', recordedAt: '21 Sep 2026 09:14:22 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r2', recordNumber: 'PST-0000919', accountId: 'a1', direction: 'debit', amount: '18.50', currency: 'SGD', effectiveDate: '2026-09-21', category: 'fee', description: 'Transfer fee, batch 4471.', counterpartyAccountId: 'a6', counterpartyReference: null, transactionGroupId: 'tgr_88f102', externalReference: null, metadata: [], recordedBy: 'usr_4f21c8', recordedAt: '21 Sep 2026 09:14:22 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r3', recordNumber: 'PST-0000920', accountId: 'a2', direction: 'debit', amount: '1820.40', currency: 'SGD', effectiveDate: '2026-09-20', category: 'settlement', description: 'Corridor SG–MY settlement, cycle 208.', counterpartyAccountId: null, counterpartyReference: 'cycle:208', transactionGroupId: null, externalReference: null, metadata: [{ key: 'corridor', value: 'sg-my' }], recordedBy: 'svc_settlement', recordedAt: '20 Sep 2026 23:05:01 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r4', recordNumber: 'PST-0000921', accountId: 'a4', direction: 'credit', amount: '120000.00', currency: 'USD', effectiveDate: '2026-09-19', category: 'transfer', description: null, counterpartyAccountId: null, counterpartyReference: 'nostro:funding', transactionGroupId: null, externalReference: 'trs:fund-0912', metadata: [], recordedBy: 'usr_1b77a0', recordedAt: '19 Sep 2026 14:41:08 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r5', recordNumber: 'PST-0000922', accountId: 'a1', direction: 'debit', amount: '950.00', currency: 'SGD', effectiveDate: '2026-09-18', category: 'adjustment', description: 'Manual adjustment, later corrected.', counterpartyAccountId: null, counterpartyReference: null, transactionGroupId: null, externalReference: null, metadata: [], recordedBy: 'usr_9a30de', recordedAt: '18 Sep 2026 11:02:40 UTC', status: 'Reversed', reversedBy: 'PST-0000923', reverses: null, reversalReason: 'Amount applied twice — duplicate of PST-0000918.' },
  { id: 'r6', recordNumber: 'PST-0000923', accountId: 'a1', direction: 'credit', amount: '950.00', currency: 'SGD', effectiveDate: '2026-09-18', category: 'reversal', description: 'Reverses PST-0000922 — amount applied twice.', counterpartyAccountId: null, counterpartyReference: null, transactionGroupId: null, externalReference: null, metadata: [], recordedBy: 'usr_9a30de', recordedAt: '18 Sep 2026 11:06:12 UTC', status: 'Posted', reversedBy: null, reverses: 'PST-0000922', reversalReason: 'Amount applied twice — duplicate of PST-0000918.' },
  { id: 'r7', recordNumber: 'PST-0000924', accountId: 'a5', direction: 'credit', amount: '4200000', currency: 'JPY', effectiveDate: '2026-09-15', category: 'transfer', description: 'Payroll pre-fund, September cycle.', counterpartyAccountId: 'a4', counterpartyReference: null, transactionGroupId: 'tgr_71aa93', externalReference: null, metadata: [{ key: 'cycle', value: '2026-09' }], recordedBy: 'svc_payroll', recordedAt: '15 Sep 2026 02:00:07 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r8', recordNumber: 'PST-0000925', accountId: 'a6', direction: 'credit', amount: '18.50', currency: 'SGD', effectiveDate: '2026-09-14', category: 'fee', description: 'Fee recognition, batch 4470.', counterpartyAccountId: 'a1', counterpartyReference: null, transactionGroupId: null, externalReference: null, metadata: [], recordedBy: 'svc_billing', recordedAt: '14 Sep 2026 09:30:11 UTC', status: 'Posted', reversedBy: null, reverses: null },
  { id: 'r9', recordNumber: 'PST-0000926', accountId: 'a3', direction: 'credit', amount: '1204.55', currency: 'SGD', effectiveDate: '2026-09-12', category: 'adjustment', description: 'Unmatched inbound, held pending attribution.', counterpartyAccountId: null, counterpartyReference: 'ref:unmatched-88', transactionGroupId: null, externalReference: null, metadata: [], recordedBy: 'svc_ingest', recordedAt: '12 Sep 2026 17:22:55 UTC', status: 'Posted', reversedBy: null, reverses: null }
];

const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' }
];
const PERIOD_FROM = { '7d': '2026-09-15', '14d': '2026-09-08', '30d': '2026-08-23', '90d': '2026-06-24' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso) {
  if (!iso) return '—';
  const p = iso.split('-');
  return p[2].replace(/^0/, '') + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
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

const requested = new URLSearchParams(location.search).get('account');
const BASE = ACCOUNTS.find((a) => a.accountNumber === requested) || ACCOUNTS[0];

function AccountDetailScreen() {
  const [account, setAccount] = React.useState(BASE);
  const [records, setRecords] = React.useState(SEED.filter((r) => r.accountId === BASE.id));
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [idemKey, setIdemKey] = React.useState(mintKey);
  const [seq, setSeq] = React.useState(0);
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

  const dp = dec(account.currency);
  const selected = records.find((r) => r.id === selectedId) || null;
  const dirty = draft && mode === 'create' ? Boolean(draft.amount || draft.description || draft.counterpartyAccountId || draft.counterpartyReference || draft.transactionGroupId || draft.externalReference || draft.metadata.length) : false;

  const rows = records
    .filter((r) => (directionFilter === 'Any' || r.direction === directionFilter)
      && (categoryFilter === 'Any' || r.category === categoryFilter)
      && (statusFilter === 'Any' || r.status === statusFilter)
      && r.effectiveDate >= PERIOD_FROM[period]
      && (query.trim() === '' || [r.recordNumber, r.description || '', r.transactionGroupId || '', r.counterpartyReference || '', r.externalReference || ''].join(' ').toLowerCase().includes(query.trim().toLowerCase())))
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
  const openEditAccount = () => {
    setSelectedId(null);
    setDraft({
      name: account.name,
      classification: account.classification,
      permittedToGoNegative: account.permittedToGoNegative,
      overdraftLimit: account.overdraftLimit === null ? '' : String(account.overdraftLimit),
      minimumBalance: account.minimumBalance === null ? '' : String(account.minimumBalance),
      metadata: (account.metadata || []).map((m) => ({ ...m }))
    });
    setMode('edit-account'); setErrors([]);
  };
  const openCreate = () => {
    setSelectedId(null);
    setDraft({ direction: 'credit', amount: '', effectiveDate: TODAY, category: 'transfer', description: null, counterpartyAccountId: null, counterpartyReference: null, transactionGroupId: null, externalReference: null, metadata: [] });
    setMode('create'); setErrors([]); setIdemKey(mintKey());
  };

  const applyDelta = (direction, amount) => setAccount((a) => ({ ...a, balance: Number(a.balance) + (direction === 'credit' ? Number(amount) : -Number(amount)) }));

  const validate = () => {
    const found = [];
    const amount = String(draft.amount || '').trim();
    if (account.status === 'Frozen' || account.status === 'Closed') found.push({ message: account.accountNumber + ' is ' + account.status.toLowerCase() + '. No record can be posted against it.', code: 'ACCOUNT_NOT_POSTABLE' });
    else if (account.status === 'Dormant' && draft.direction === 'debit') found.push({ message: 'Debits are disabled: this account is dormant. A credit can still be recorded.', code: 'DEBIT_NOT_PERMITTED' });
    if (amount === '') found.push({ message: 'Amount is required.', code: 'AMOUNT_REQUIRED' });
    else if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) === 0) found.push({ message: 'Amount takes a positive decimal, written unsigned — the direction carries the sign.', code: 'INVALID_AMOUNT' });
    else if (scaleOf(amount) > dp) found.push({ message: 'Amount carries ' + scaleOf(amount) + ' decimal places; ' + account.currency + ' is stored at ' + dp + '.', code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY' });
    if (draft.effectiveDate && draft.effectiveDate > TODAY) found.push({ message: 'Effective date cannot be in the future.', code: 'EFFECTIVE_DATE_IN_FUTURE' });
    if (draft.direction === 'debit' && /^\d+(\.\d+)?$/.test(amount)) {
      const floor = floorOf(account);
      const after = Number(account.balance) - Number(amount);
      if (floor !== null && after < floor) found.push({ message: 'This debit would take ' + account.accountNumber + ' to ' + after.toFixed(dp) + ', below its floor of ' + floor.toFixed(dp) + ' ' + account.currency + '.', code: 'INSUFFICIENT_FUNDS' });
    }
    setErrors(found);
    return found.length === 0;
  };

  const saveAccount = () => {
    const found = [];
    const limit = String(draft.overdraftLimit || '').trim();
    const floorMin = String(draft.minimumBalance || '').trim();
    if (!(draft.name || '').trim()) found.push({ message: 'Name is required.', code: 'ACCOUNT_NAME_REQUIRED' });
    if (CLASSIFICATIONS.indexOf(draft.classification) === -1) found.push({ message: 'Classification takes one of: ' + CLASSIFICATIONS.join(', ') + '.', code: 'INVALID_CLASSIFICATION' });
    if (draft.permittedToGoNegative) {
      if (limit === '') found.push({ message: 'Overdraft limit is required when the account is permitted to go negative — it is the floor.', code: 'OVERDRAFT_LIMIT_REQUIRED' });
      else if (!/^\d+(\.\d+)?$/.test(limit)) found.push({ message: 'Overdraft limit takes a positive decimal amount, written unsigned.', code: 'INVALID_OVERDRAFT_LIMIT' });
      else if (scaleOf(limit) > dp) found.push({ message: 'Overdraft limit carries ' + scaleOf(limit) + ' decimal places; ' + account.currency + ' is stored at ' + dp + '.', code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY' });
    } else if (limit !== '') {
      found.push({ message: 'An overdraft limit cannot be set while the account is not permitted to go negative.', code: 'OVERDRAFT_LIMIT_NOT_PERMITTED' });
    }
    if (floorMin !== '') {
      if (!/^-?\d+(\.\d+)?$/.test(floorMin)) found.push({ message: 'Minimum balance takes a decimal amount.', code: 'INVALID_MINIMUM_BALANCE' });
      else if (scaleOf(floorMin) > dp) found.push({ message: 'Minimum balance carries ' + scaleOf(floorMin) + ' decimal places; ' + account.currency + ' is stored at ' + dp + '.', code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY' });
      else if (!draft.permittedToGoNegative && Number(floorMin) < 0) found.push({ message: 'Minimum balance cannot be negative while the account is not permitted to go negative.', code: 'MINIMUM_BALANCE_BELOW_ZERO' });
    }
    if (found.length) { setErrors(found); return; }
    setErrors([]);
    setAccount((a) => ({
      ...a,
      name: draft.name.trim(),
      classification: draft.classification,
      permittedToGoNegative: draft.permittedToGoNegative,
      overdraftLimit: limit === '' ? null : limit,
      minimumBalance: floorMin === '' ? null : floorMin,
      metadata: draft.metadata
    }));
    setMode(null); setDraft(null);
    setFlash({ title: 'Changes saved', text: 'Updated ' + account.accountNumber + '. Group, account number and currency are unchanged; no posting was made.' });
  };

  const record = () => {
    const created = {
      ...draft,
      id: 'r' + (SEED.length + seq + 1),
      recordNumber: 'PST-' + String(10000927 + seq).slice(1),
      accountId: account.id,
      currency: account.currency,
      amount: String(draft.amount).trim(),
      recordedBy: CALLER,
      recordedAt: '22 Sep 2026 10:12:44 UTC',
      status: 'Posted', reversedBy: null, reverses: null
    };
    setRecords((rs) => [created].concat(rs));
    setSeq((n) => n + 1);
    applyDelta(created.direction, created.amount);
    setSelectedId(created.id);
    setMode('view');
    setDraft(null);
    setDialog(null);
    setIdemKey(mintKey());
    setFlash({ title: 'Record posted', text: created.recordNumber + ' — ' + created.direction + ' of ' + created.amount + ' ' + created.currency + ' against ' + account.accountNumber + ', effective ' + fmtDate(created.effectiveDate) + '. The balance above reflects it.' });
  };

  const reverse = (r, why) => {
    const counter = {
      ...r,
      id: 'r' + (SEED.length + seq + 1),
      recordNumber: 'PST-' + String(10000927 + seq).slice(1),
      direction: r.direction === 'credit' ? 'debit' : 'credit',
      category: 'reversal',
      description: 'Reverses ' + r.recordNumber + ' — ' + why,
      metadata: [], externalReference: null,
      recordedBy: CALLER, recordedAt: '22 Sep 2026 10:12:44 UTC',
      status: 'Posted', reversedBy: null, reverses: r.recordNumber, reversalReason: why
    };
    setRecords((rs) => [counter].concat(rs.map((x) => (x.id === r.id ? { ...x, status: 'Reversed', reversedBy: counter.recordNumber, reversalReason: why } : x))));
    applyDelta(counter.direction, counter.amount);
    setSeq((n) => n + 1);
    setDialog(null); setReason(''); setReasonError(false);
    setSelectedId(counter.id); setMode('view');
    setFlash({ title: 'Record reversed', text: counter.recordNumber + ' was recorded as the opposing entry and ' + r.recordNumber + ' is marked Reversed. Nothing was erased — this account carries both rows.' });
  };

  const mono = (v) => <Mono>{v}</Mono>;
  const columns = [
    { key: 'recordNumber', header: 'Record no.', sortable: true, render: (r) => <Mono style={{ fontWeight: 'var(--weight-semibold)' }}>{r.recordNumber}</Mono> },
    { key: 'direction', header: 'Direction', sortable: true, render: (r) => <Badge tone={r.direction === 'credit' ? 'credit' : 'debit'}>{r.direction}</Badge> },
    { key: 'category', header: 'Category', sortable: true, render: (r) => <Chip>{r.category}</Chip> },
    { key: 'description', header: 'Description', sortable: false, render: (r) => (r.description ? <span>{r.description}</span> : <Caption>Not set.</Caption>) },
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
      title={mode === 'edit-account' ? 'Edit ' + account.accountNumber : mode === 'create' ? 'Record posting' : selected
        ? <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span><Mono>{selected.recordNumber}</Mono></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}><Chip>{selected.category}</Chip><StatusBadge status={selected.status} /></span>
        </span>
        : ''}
      footnote={mode === 'edit-account'
        ? 'Group, account number, currency and external reference are fixed once the account is open.'
        : mode === 'create'
          ? null
          : selected
          ? (selected.status === 'Reversed'
            ? <>Already reversed by <Mono>{selected.reversedBy}</Mono> — reversing again is refused with <Mono>POSTING_ALREADY_REVERSED</Mono>.</>
            : selected.reverses
              ? <>This record is itself a reversal of <Mono>{selected.reverses}</Mono>. Reversing a reversal is refused with <Mono>POSTING_IS_REVERSAL</Mono>.</>
              : 'Records are immutable. Reversing records an opposing entry; it does not edit or delete this row.')
          : null}
      actions={mode === 'edit-account'
        ? (
          <>
            <Button size="sm" onClick={closePanel}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={saveAccount}>Save changes</Button>
          </>
        )
        : mode === 'create'
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
      {mode === 'edit-account' && draft ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-table-size)' }}>
            <FormRow label="Account no.">
              <ReadOnlyField><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mono>{account.accountNumber}</Mono><Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span></ReadOnlyField>
            </FormRow>
            <FormRow label="Currency">
              <ReadOnlyField><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Currency code={account.currency} /><Caption>{dp} dp</Caption><Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span></ReadOnlyField>
            </FormRow>
            <FormRow label="Name" required>
              <Input value={draft.name} invalid={errors.some((e) => e.code === 'ACCOUNT_NAME_REQUIRED')} onChange={(e) => set({ name: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Classification" required>
              <Select options={CLASSIFICATIONS} value={draft.classification} onChange={(e) => set({ classification: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Floor policy" hint={draft.permittedToGoNegative
              ? 'An overdraft limit is required while this is on — the floor is \u2212limit.'
              : 'The floor is the minimum balance, or zero when none is set.'}>
              <Checkbox checked={draft.permittedToGoNegative} onChange={(e) => set({ permittedToGoNegative: e.target.checked, overdraftLimit: e.target.checked ? draft.overdraftLimit : '' })} label="Permitted to go negative" />
            </FormRow>
            <FormRow label="Overdraft limit" required={draft.permittedToGoNegative} hint={draft.permittedToGoNegative ? 'Unsigned, at ' + dp + ' decimal places.' : null}>
              {draft.permittedToGoNegative
                ? <Input numeric value={draft.overdraftLimit} placeholder="50000.00" invalid={errors.some((e) => e.code.indexOf('OVERDRAFT') > -1)} onChange={(e) => set({ overdraftLimit: e.target.value })} style={{ width: 160 }} aria-label="Overdraft limit" />
                : <ReadOnlyField><Caption>Unavailable while the account may not go negative.</Caption></ReadOnlyField>}
            </FormRow>
            <FormRow label="Minimum balance" hint="Optional. Sent as null when left empty.">
              <Input numeric value={draft.minimumBalance} placeholder="0.00" invalid={errors.some((e) => e.code.indexOf('MINIMUM') > -1)} onChange={(e) => set({ minimumBalance: e.target.value })} style={{ width: 160 }} aria-label="Minimum balance" />
            </FormRow>
          </div>
          <DetailSection>Metadata</DetailSection>
          <MetadataEditor entries={draft.metadata} onChange={(entries) => set({ metadata: entries })} />
          <Note style={{ marginTop: 'var(--space-3)' }}>String keys and values only.</Note>
          <div ref={errorRef}>
            {errors.length ? <RefusalAlert errors={errors} style={{ marginTop: 'var(--space-4)' }} /> : null}
          </div>
        </>
      ) : mode === 'view' && selected ? (
        <>
          <DetailSection divider={false} style={{ marginTop: 0 }}>Movement</DetailSection>
          <DetailList items={[
            { label: 'Direction', value: <Badge tone={selected.direction === 'credit' ? 'credit' : 'debit'}>{selected.direction}</Badge> },
            { label: 'Amount', value: <Money amount={selected.direction === 'debit' ? '-' + selected.amount : selected.amount} currency={selected.currency} decimalPlaces={dec(selected.currency)} signed showCurrency struck={selected.status === 'Reversed'} /> },
            { label: 'Effective', value: fmtDate(selected.effectiveDate) },
            { label: 'Category', value: selected.category }
          ]} />
          <DetailSection>References</DetailSection>
          <DetailList items={[
            { label: 'Description', value: selected.description || <Caption>Not set.</Caption> },
            { label: 'Counterparty', value: selected.counterpartyAccountId
              ? mono((ACCOUNTS.find((a) => a.id === selected.counterpartyAccountId) || {}).accountNumber || selected.counterpartyAccountId)
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
            <FormRow label="Account">
              <ReadOnlyField>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mono>{account.accountNumber}</Mono><Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span>
              </ReadOnlyField>
            </FormRow>
            <FormRow label="Currency">
              <ReadOnlyField>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Currency code={account.currency} /><Caption>{dp} dp</Caption><Icon name="lock" size={13} style={{ color: 'var(--muted-foreground)' }} /></span>
              </ReadOnlyField>
            </FormRow>
            <FormRow label="Direction" required hint={account.status === 'Dormant' ? 'Debits are disabled: this account is dormant. A credit can still be recorded.' : null}>
              <Select options={[{ value: 'credit', label: 'Credit' }, { value: 'debit', label: 'Debit' }]} value={draft.direction} onChange={(e) => set({ direction: e.target.value })} style={{ width: '100%' }} />
            </FormRow>
            <FormRow label="Amount" required hint={'Unsigned, at ' + dp + ' decimal places. Balance is now ' + Number(account.balance).toFixed(dp) + ' ' + account.currency + '.'}>
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
              <Select options={[{ value: '', label: 'None' }].concat(ACCOUNTS.filter((a) => a.id !== account.id).map((a) => ({ value: a.id, label: a.accountNumber })))} value={draft.counterpartyAccountId || ''} onChange={(e) => set({ counterpartyAccountId: e.target.value === '' ? null : e.target.value })} style={{ width: '100%' }} />
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

  const postable = account.status === 'Active' || account.status === 'Dormant';

  return (
    <>
      <AppShell
        sidebar={<Sidebar sections={NAV} active="accounts" />}
        topbarRight={<UserMenu name="Steven Ho" email="steven.ho@transwap.com" tenant="Transwap" objectId="8f2c41de-90a1-4c33-b0f2-77e5a1c9d412" scopes={['accounts.read', 'accounts.write', 'postings.read', 'postings.write']} missingScopes={['postings.reverse']} onSignOut={() => {}} />}
        breadcrumb={<Breadcrumb items={[{ label: 'Ledger', href: '#' }, { label: 'Accounts', href: '../accounts-crud/index.html' }, { label: account.accountNumber }]} />}
        panel={panel}
        panelOpen={panelOpen}
        style={{ minWidth: 1180 }}
      >
        <PageHeader
          icon="wallet"
          title={account.accountNumber}
          description={account.name + ' · group ' + account.groupId + ' · ' + account.currency + ' · ' + account.classification + ' · opened ' + account.openedOn}
          actions={
            <>
              <StatusBadge status={account.status} />
              <Button icon={<Icon name="pencil" size={14} />} onClick={openEditAccount} aria-label={'Edit ' + account.accountNumber} title="Edit account" style={{ height: 36, padding: '0 10px' }} />
              <Button icon={<Icon name="download" size={14} />} onClick={() => setFlash({ title: 'Export queued', text: rows.length + ' records on ' + account.accountNumber + ' will be written to CSV and mailed to you when ready.' })}>Export</Button>
              <Button variant="primary" icon={<Icon name="plus" size={14} />} disabled={!postable} onClick={openCreate}>Record posting</Button>
            </>
          }
        />

        {!postable ? (
          <Note>{account.accountNumber} is {account.status.toLowerCase()} — recording is refused with <Mono>ACCOUNT_NOT_POSTABLE</Mono>. Its records stay readable.</Note>
        ) : null}

        {flash ? (
          <Card style={{ borderLeft: '3px solid var(--credit)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
            <div style={{ minWidth: 0 }}>
              <Label>{flash.title}</Label>
              <div style={{ marginTop: 6, fontSize: 'var(--text-table-size)' }}>{flash.text}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFlash(null)} style={{ marginLeft: 'auto', color: 'var(--muted-foreground)' }} aria-label="Dismiss"><Icon name="x" size={14} /></Button>
          </Card>
        ) : null}

        <BalanceTiles account={{ balance: account.balance, availableBalance: account.balance, heldAmount: account.heldAmount, currency: account.currency, decimalPlaces: dp }} />
        <FloorLine account={{ permittedToGoNegative: account.permittedToGoNegative, overdraftLimit: account.overdraftLimit, minimumBalance: account.minimumBalance, currency: account.currency, decimalPlaces: dp }} />

        <Card padded={false}>
          <CardBar position="top">
            <Input placeholder="Search record or reference" prefix={<Icon name="search" size={14} />} value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 240 }} aria-label="Search records on this account" />
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
            emptyMessage="No records on this account in this period."
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
        <Note>This table sorts, so it is not a statement. <Mono>Balance after</Mono> is carried in stream order on the account's statement, where the sequence is what makes the running balance true.</Note>
      </AppShell>

      {dialog && dialog.kind === 'confirm' && draft ? (
        <ConfirmMovement
          open
          direction={draft.direction === 'credit' ? 'Credit' : 'Debit'}
          amount={draft.amount}
          currency={account.currency}
          decimalPlaces={dp}
          accountNumber={account.accountNumber}
          accountName={account.name}
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
          accountNumber={account.accountNumber}
          accountName={account.name}
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
            <div>Reversing <Mono>{dialog.record.recordNumber}</Mono> posts an opposing entry against <Mono>{account.accountNumber}</Mono>. Nothing is erased.</div>
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

ReactDOM.createRoot(document.getElementById('root')).render(<AccountDetailScreen />);
