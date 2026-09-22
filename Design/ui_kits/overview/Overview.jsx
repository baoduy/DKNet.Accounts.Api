const {
  AppShell, Sidebar, PageHeader, UserMenu, Card, CardBar, Button, Icon, Chip, Input, Tabs,
  Label, Caption, Note, Mono, Breadcrumb, Money, Currency
} = window.DKNetAccountsDesignSystem_97519d;

const NAV = [
  { title: 'LEDGER', items: [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard', href: '#' },
    { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '../accounts-crud/index.html' },
    { id: 'records', label: 'Records', icon: 'file-text', href: '../records-crud/index.html' }
  ] },
  { title: 'ADMINISTRATION', pinToBottom: true, items: [
    { id: 'groups', label: 'Account groups', icon: 'folder', href: '../account-groups-crud/index.html' },
    { id: 'currencies', label: 'Currencies', icon: 'coins', href: '../currencies-crud/index.html' }
  ] }
];

/* Per-currency ledger position. Balance, available and held are three values —
   never one, and never added across rows. */
const BALANCES = [
  { code: 'SGD', name: 'Singapore Dollar', dp: 2, balance: 4182940.75, held: 218400, accounts: 41 },
  { code: 'USD', name: 'United States Dollar', dp: 2, balance: 1905220, held: 64900, accounts: 36 },
  { code: 'JPY', name: 'Japanese Yen', dp: 0, balance: 182400000, held: 0, accounts: 8 },
  { code: 'KWD', name: 'Kuwaiti Dinar', dp: 3, balance: 41820.5, held: 1200, accounts: 2 }
];

const ACCOUNT_STATUS = [
  { status: 'Active', count: 318, colour: 'var(--credit)' },
  { status: 'Dormant', count: 42, colour: 'var(--warning)' },
  { status: 'Frozen', count: 9, colour: 'var(--debit)' },
  { status: 'Closed', count: 87, colour: 'var(--muted-foreground)' }
];

const GROUP_TYPES = [
  { type: 'Customer', count: 74 },
  { type: 'Merchant', count: 21 },
  { type: 'Internal', count: 9 },
  { type: 'Suspense', count: 4 },
  { type: 'Settlement', count: 3 }
];

const GROUP_STATUS = { Active: 104, Closed: 7 };

/* The list routes take fromDate / toDate on last activity, so an activity window is the
   one date control this API can actually answer. Balances are as-at and never windowed. */
const WINDOWS = [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All time' }];
const ACTIVE_IN_WINDOW = { 7: 186, 30: 274, 90: 341, all: 456 };
const GROUPS_IN_WINDOW = { 7: 48, 30: 79, 90: 96, all: 111 };

const RECENT = [
  { number: 'ACME-000123', name: 'ACME operating', currency: 'SGD', seen: '22 Sep 09:14' },
  { number: 'ACME-000180', name: 'ACME settlement float', currency: 'SGD', seen: '22 Sep 08:52' },
  { number: 'NOVA-000014', name: 'Nova merchant payouts', currency: 'USD', seen: '21 Sep 17:40' },
  { number: 'HLDG-000002', name: 'Holdings suspense', currency: 'JPY', seen: '21 Sep 16:03' },
  { number: 'ACME-000004', name: 'ACME fees collected', currency: 'SGD', seen: '19 Sep 14:41' }
];

const fmt = (n, dp) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

function describe(raw) {
  const v = raw.trim();
  if (!v) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    return { label: 'Identifier', text: 'Read as a UUID — account, then group, then posting. The first that resolves opens.' };
  }
  if (/^[A-Z][A-Z0-9]{1,9}-\d{1,10}$/i.test(v)) {
    return { label: 'Account no.', text: 'GET /v1/accounts?filter=AccountNumber:Equal:' + v.toUpperCase() };
  }
  if (v.length < 2) {
    return { label: 'Too short', warn: true, text: 'The API\u2019s search takes two characters minimum, so nothing is sent — one character would answer 400.' };
  }
  return { label: 'Free text', text: 'GET /v1/accounts?search=' + v + '  ·  GET /v1/account-groups?search=' + v };
}

function CardHead({ label, children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
      <div style={{ minWidth: 0 }}>
        <Label>{label}</Label>
        {children ? <div style={{ marginTop: 6, fontSize: 'var(--text-table-size)' }}>{children}</div> : null}
      </div>
      {right ? <div style={{ marginLeft: 'auto', flex: 'none' }}>{right}</div> : null}
    </div>
  );
}

function Tile({ label, value, children }) {
  return (
    <Card>
      <Label>{label}</Label>
      <div style={{ fontSize: 'var(--text-tile-amount-size)', lineHeight: 'var(--text-tile-amount-leading)', fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{value}</div>
      <Note style={{ marginTop: 2 }}>{children}</Note>
    </Card>
  );
}

function Swatch({ colour, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 'var(--radius-sm)', background: colour, flex: 'none' }}></span>
      <Caption style={{ minWidth: 0, whiteSpace: 'nowrap' }}>{children}</Caption>
    </span>
  );
}

const ROW_GRID = { display: 'grid', gridTemplateColumns: '150px minmax(40px, 1fr) max-content max-content max-content', columnGap: 'var(--space-4)', alignItems: 'center' };
const CELL = { borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' };
const AMOUNT = { ...CELL, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/* One grid for the head and every row together, so the three amount columns share
   one width instead of each row sizing its own. */
function BalanceTable({ rows }) {
  return (
    <div style={ROW_GRID}>
      <Label>Currency</Label>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', minWidth: 0 }}>
        <Swatch colour="var(--chart-1)">Available</Swatch>
        <Swatch colour="var(--chart-4)">Held</Swatch>
      </div>
      <Label style={{ textAlign: 'right' }}>Available</Label>
      <Label style={{ textAlign: 'right' }}>Held</Label>
      <Label style={{ textAlign: 'right' }}>Balance</Label>
      {rows.map((row) => {
        const available = row.balance - row.held;
        const share = row.balance === 0 ? 0 : (available / row.balance) * 100;
        return (
          <React.Fragment key={row.code}>
            <div style={{ ...CELL, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-table-size)', fontWeight: 'var(--weight-semibold)' }}><Currency code={row.code} /></div>
              <Caption>{row.accounts} accounts · {row.dp} dp</Caption>
            </div>
            <div style={{ ...CELL, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', width: '100%', height: 8, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--muted)' }}>
                <div style={{ width: share + '%', background: 'var(--chart-1)' }} title={'Available ' + fmt(available, row.dp)}></div>
                <div style={{ width: (100 - share) + '%', background: 'var(--chart-4)' }} title={'Held ' + fmt(row.held, row.dp)}></div>
              </div>
            </div>
            <Caption style={AMOUNT}>{fmt(available, row.dp)}</Caption>
            <Caption style={AMOUNT}>{fmt(row.held, row.dp)}</Caption>
            <div style={{ ...CELL, textAlign: 'right' }}><Money amount={row.balance} decimalPlaces={row.dp} /></div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StatusDonut({ data, total, focused, onFocus }) {
  const R = 46, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 132, height: 132, flex: 'none' }}>
        <svg width="132" height="132" viewBox="0 0 120 120" aria-hidden="true">
          <g transform="rotate(-90 60 60)">
            {data.map((d) => {
              const len = (d.count / total) * C;
              const dash = <circle
                key={d.status}
                cx="60" cy="60" r={R} fill="none"
                stroke={d.colour}
                strokeWidth={focused === d.status ? 20 : 16}
                strokeDasharray={len + ' ' + (C - len)}
                strokeDashoffset={-offset}
                style={{ transition: 'stroke-width 120ms ease' }}
              />;
              offset += len;
              return dash;
            })}
          </g>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 'var(--text-tile-amount-size)', fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'tabular-nums' }}>{total}</div>
          <Caption>accounts</Caption>
        </div>
      </div>
      <div style={{ flex: '1 1 200px', minWidth: 180, display: 'flex', flexDirection: 'column' }}>
        {data.map((d) => (
          <button
            key={d.status}
            type="button"
            onMouseEnter={() => onFocus(d.status)}
            onMouseLeave={() => onFocus(null)}
            onFocus={() => onFocus(d.status)}
            onBlur={() => onFocus(null)}
            style={{
              display: 'grid', gridTemplateColumns: '16px minmax(56px, 1fr) 44px 48px', alignItems: 'center',
              gap: 'var(--space-2)', padding: '7px var(--space-2)', border: 0, borderRadius: 'var(--radius-md)',
              background: focused === d.status ? 'var(--surface-hover)' : 'transparent',
              font: 'inherit', fontSize: 'var(--text-table-size)', color: 'var(--foreground)',
              textAlign: 'left', cursor: 'pointer', width: '100%'
            }}
          >
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 'var(--radius-sm)', background: d.colour }}></span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.status}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'var(--weight-semibold)' }}>{d.count}</span>
            <Caption style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{((d.count / total) * 100).toFixed(1)}%</Caption>
          </button>
        ))}
      </div>
    </div>
  );
}

function OverviewScreen() {
  const [query, setQuery] = React.useState('');
  const [window_, setWindow] = React.useState('30');
  const [focused, setFocused] = React.useState(null);

  const hint = describe(query);
  const accountTotal = ACCOUNT_STATUS.reduce((s, d) => s + d.count, 0);
  const groupTotal = GROUP_STATUS.Active + GROUP_STATUS.Closed;
  const typeMax = Math.max(...GROUP_TYPES.map((g) => g.count));

  return (
    <AppShell
      sidebar={<Sidebar sections={NAV} active="overview" />}
      topbarRight={<UserMenu name="Steven Ho" email="steven.ho@transwap.com" tenant="Transwap" objectId="8f2c41de-90a1-4c33-b0f2-77e5a1c9d412" scopes={['accounts.read', 'accounts.write', 'postings.read', 'postings.write']} missingScopes={['postings.reverse']} onSignOut={() => {}} />}
      breadcrumb={<Breadcrumb items={[{ label: 'Ledger', href: '#' }, { label: 'Overview' }]} />}
      style={{ minWidth: 1180 }}
    >
      <PageHeader
        icon="layout-dashboard"
        title="Overview"
        meta={
          <>
            <Caption>Activity window</Caption>
            <Tabs items={WINDOWS} value={window_} onChange={setWindow} />
            <Caption><Mono style={{ fontSize: 'var(--text-caption-size)' }}>{window_ === 'all' ? 'fromDate=0001-01-01' : 'fromDate=' + window_ + ' days ago'}</Mono></Caption>
          </>
        }
        description="Find an account, then read the ledger's position. Balances are as at 22 Sep 2026 09:20 UTC and are not scoped by the window."
        actions={
          <>
            <Button icon={<Icon name="wallet" size={14} />} onClick={() => { window.location.href = '../accounts-crud/index.html'; }}>Open account</Button>
            <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => { window.location.href = '../records-crud/index.html'; }}>Record posting</Button>
          </>
        }
      />

      <Card>
        <Label>Find an account, group or posting</Label>
        <div data-search-shell="" style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          <Input
            autoFocus
            placeholder="Account number, name, group code or identifier"
            prefix={<Icon name="search" size={16} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
            aria-label="Search accounts, groups and postings"
          />
          <Chip style={{ alignSelf: 'center' }}><Mono>⌘K</Mono></Chip>
        </div>
        {hint ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            <Chip>{hint.label}</Chip>
            <Note style={{ color: hint.warn ? 'var(--warning)' : 'var(--muted-foreground)' }}>
              {hint.warn ? hint.text : <Mono style={{ fontSize: 'var(--text-caption-size)' }}>{hint.text}</Mono>}
            </Note>
          </div>
        ) : (
          <Note style={{ marginTop: 'var(--space-3)' }}>What you type decides the route: a UUID resolves directly, <Mono>GROUP-000123</Mono> filters on account number, anything else searches accounts and groups together.</Note>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--space-5)' }}>
        <Tile label="Accounts" value={accountTotal}>
          {ACTIVE_IN_WINDOW[window_]} posted to in this window · 318 active
        </Tile>
        <Tile label="Account groups" value={groupTotal}>
          {GROUPS_IN_WINDOW[window_]} with activity in this window · {GROUP_STATUS.Closed} closed
        </Tile>
        <Tile label="Currencies" value={6}>
          4 carry a balance · 1 closed
        </Tile>
        <Tile label="Needs attention" value={51}>
          42 dormant · 9 frozen — <Mono style={{ fontSize: 'var(--text-caption-size)' }}>filter=Status:In:Dormant,Frozen</Mono>
        </Tile>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        <Card>
          <CardHead label="Position by currency" right={<Caption><Mono>GET /v1/account-groups/{'{id}'}/balances</Mono></Caption>}>
            Four of six registered currencies carry a balance.
          </CardHead>
          <BalanceTable rows={BALANCES} />
          <Note style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
            Balances are reported per currency and are never combined into a single total. Each bar is scaled to its own row's balance, so the split between available and held is comparable within a currency and not between them.
          </Note>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Card>
            <CardHead label="Accounts by status" right={<Chip><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="triangle-alert" size={12} />Needs one route</span></Chip>}>
              {accountTotal} accounts across {groupTotal} groups.
            </CardHead>
            <StatusDonut data={ACCOUNT_STATUS} total={accountTotal} focused={focused} onFocus={setFocused} />
            <Note style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <Mono style={{ fontSize: 'var(--text-caption-size)' }}>MapGetStatusCounts&lt;Account&gt;</Mono> exists but is mapped to no route, so these counts are illustrative. They are not computed client-side: <Mono style={{ fontSize: 'var(--text-caption-size)' }}>pageSize</Mono> caps at 1000 and a count over a full listing would be silently wrong above that.
            </Note>
          </Card>

          <Card>
            <CardHead label="Account groups">
              {GROUP_STATUS.Active} active · {GROUP_STATUS.Closed} closed
            </CardHead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {GROUP_TYPES.map((g) => (
                <div key={g.type} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr) 36px', gap: 'var(--space-3)', alignItems: 'center', fontSize: 'var(--text-table-size)' }}>
                  <span>{g.type}</span>
                  <span style={{ display: 'block', height: 8, borderRadius: 'var(--radius-sm)', background: 'var(--muted)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: (g.count / typeMax) * 100 + '%', background: 'var(--chart-2)' }}></span>
                  </span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'var(--weight-semibold)' }}>{g.count}</span>
                </div>
              ))}
            </div>
            <Note style={{ marginTop: 'var(--space-4)' }}>Bars are scaled to Customer, the largest type. Type is queryable, so each bar is a filter: <Mono style={{ fontSize: 'var(--text-caption-size)' }}>filter=Type:Equal:Customer</Mono>.</Note>
          </Card>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        <Card padded={false}>
          <CardBar position="top">
            <Label>Recently viewed</Label>
            <Caption style={{ marginLeft: 'auto' }}>Last 10 · held in this browser</Caption>
          </CardBar>
          <div>
            {RECENT.map((r, i) => (
              <a
                key={r.number}
                href={'../account-detail/index.html?account=' + r.number}
                style={{
                  display: 'grid', gridTemplateColumns: 'max-content minmax(120px, 1fr) max-content max-content 20px',
                  gap: 'var(--space-4)', alignItems: 'center', textDecoration: 'none', color: 'inherit',
                  padding: 'var(--cell-padding-y) var(--cell-padding-x)',
                  borderTop: i === 0 ? 0 : '1px solid var(--border)',
                  fontSize: 'var(--text-table-size)'
                }}
              >
                <Mono style={{ fontWeight: 'var(--weight-semibold)' }}>{r.number}</Mono>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <Caption><Mono>{r.currency}</Mono></Caption>
                <Caption style={{ textAlign: 'right' }}>{r.seen}</Caption>
                <Icon name="arrow-right" size={14} style={{ color: 'var(--muted-foreground)' }} />
              </a>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead label="Not charted, and why">Three insights an operations dashboard usually carries cannot be drawn against this API.</CardHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-table-size)' }}>
            <div>
              <div style={{ fontWeight: 'var(--weight-semibold)' }}>Posting volume over time</div>
              <Note>No route lists postings across accounts. A trend line would need <Mono style={{ fontSize: 'var(--text-caption-size)' }}>GET /v1/postings</Mono>, or a counts endpoint beside it.</Note>
            </div>
            <div>
              <div style={{ fontWeight: 'var(--weight-semibold)' }}>Accounts opened per month</div>
              <Note><Mono style={{ fontSize: 'var(--text-caption-size)' }}>openedOn</Mono> is computed on the entity, so filtering or ordering on it answers 400.</Note>
            </div>
            <div>
              <div style={{ fontWeight: 'var(--weight-semibold)' }}>One headline total</div>
              <Note>Balances are held per currency. A single figure would require a rate source this service does not have.</Note>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<OverviewScreen />);
