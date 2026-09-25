/**
 * DRK-1728 — the Overview branches the acceptance tests do not reach: panels without their
 * permission, a failed or pending read, a status or currency the service did not send, and every
 * state a recently viewed entry can be in.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewScreen } from './OverviewScreen';

const MAI = '11111111-1111-4111-8111-111111111111';
const ALL_READS = ['accounts.read', 'postings.read'];
const ACCOUNT_ID = 'a0000000-0000-4000-8000-000000000123';
const GROUP_ID = 'c0000000-0000-4000-8000-000000000001';
const POSTING_ID = 'b0000000-0000-4000-8000-000000010042';

type Answer = { status: number; text: string } | (() => Promise<Response>);

const DEFAULT_ANSWERS: Record<string, Answer> = {
  '/api/ledger/currencies': { status: 200, text: '[{"id":"c1","code":"SGD","name":"Singapore Dollar","decimalPlaces":2,"isActive":true}]' },
  '/api/ledger/accounts/balances': { status: 200, text: '[]' },
  '/api/ledger/accounts/status-counts': { status: 200, text: '[]' },
  '/api/ledger/account-groups/status-counts': { status: 200, text: '[]' },
  '/api/ledger/postings?': { status: 200, text: '{"items":[],"totalItemCount":0}' },
};

function stubLedger(answers: Record<string, Answer> = {}): ReturnType<typeof vi.fn> {
  const all = { ...DEFAULT_ANSWERS, ...answers };
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const match = Object.keys(all)
      .filter((prefix) => url.startsWith(prefix))
      .sort((a, b) => b.length - a.length)[0];
    if (!match) return Promise.resolve(new Response(`{"errors":[{"message":"unexpected fetch: ${url}"}]}`, { status: 404 }));
    const answer = all[match];
    return typeof answer === 'function' ? answer() : Promise.resolve(new Response(answer.text, { status: answer.status }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const items = new Map(Object.entries(entries));
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

function storeRecent(entries: Array<{ kind: string; id: string }>): void {
  const stored = entries.map((entry) => ({ ...entry, openedAt: '2026-09-24T10:00:00.000Z' }));
  vi.stubGlobal('localStorage', memoryStorage({ [`recently-viewed:${MAI}`]: JSON.stringify(stored) }));
}

function renderOverview(grantedScopes: string[] = ALL_READS): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <OverviewScreen grantedScopes={grantedScopes} directoryObjectId={MAI} />
    </QueryClientProvider>,
  );
}

function panel(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

/** The region's table once its data is drawn — while loading it holds placeholder rows (DRK-1725 R1). */
async function loadedTable(region: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const table = within(region).getByRole('table');
    expect(table.querySelector('[data-slot="skeleton"]')).toBeNull();
    return table;
  });
}

function fetched(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map(([url]) => url as string);
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a panel the operator has no permission for', () => {
  it('says so in place, never hidden, and reads nothing for it', async () => {
    const fetchMock = stubLedger();

    renderOverview([]);

    for (const [name, scope] of [
      ['Position by currency', 'accounts.read'],
      ['Accounts by status', 'accounts.read'],
      ['Groups by status', 'accounts.read'],
      ['Postings per week', 'postings.read'],
      ['Accounts opened per month', 'accounts.read'],
    ]) {
      expect(within(panel(name)).getByText(`requires ${scope}`)).toBeInTheDocument();
      expect(within(panel(name)).getByText('This panel needs a permission you do not hold.')).toBeInTheDocument();
      expect(within(panel(name)).queryByRole('table')).toBeNull();
    }
    await waitFor(() => expect(fetched(fetchMock).length).toBeGreaterThan(0));
    expect(fetched(fetchMock).filter((url) => !url.startsWith('/api/ledger/currencies'))).toEqual([]);
  });
});

describe('a read', () => {
  it("that fails states the service's refusal in its own panel and leaves the others drawn", async () => {
    stubLedger({
      '/api/ledger/account-groups/status-counts': { status: 500, text: '{"errors":[{"code":"LOCK_TIMEOUT","message":"Try again."}],"traceId":"t-9"}' },
      '/api/ledger/accounts/status-counts': { status: 200, text: '[{"type":"AccountStatus","status":"ACTIVE","count":3}]' },
    });

    renderOverview();

    expect(await within(panel('Groups by status')).findByText('LOCK_TIMEOUT')).toBeInTheDocument();
    expect(within(panel('Groups by status')).getByText('Trace: t-9')).toBeInTheDocument();
    expect(await loadedTable(panel('Accounts by status'))).toBeInTheDocument();
  });

  it('stands a placeholder cell in under every heading of a chart still being read', () => {
    stubLedger({ '/api/ledger/accounts/status-counts': () => new Promise<Response>(() => {}) });
    renderOverview();
    const table = within(panel('Accounts opened per month')).getByRole('table', { hidden: true });
    expect(table.querySelectorAll('thead th')).toHaveLength(6);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(12);
    expect(table.querySelectorAll('tbody tr:first-child td [data-slot="skeleton"]')).toHaveLength(6);
  });

  it('tries only the failed reads again on Retry, and draws the panel once they answer', async () => {
    let groupsFail = true;
    const fetchMock = stubLedger({
      '/api/ledger/account-groups/status-counts': () =>
        Promise.resolve(groupsFail ? new Response('{"errors":[{"message":"Ledger store unavailable"}]}', { status: 503 }) : new Response('[{"status":"ACTIVE","count":2}]')),
    });

    renderOverview();
    const groups = panel('Groups by status');
    expect(await within(groups).findByRole('alert')).toHaveTextContent('Ledger store unavailable');
    const accountCountReads = (): number => fetched(fetchMock).filter((url) => url === '/api/ledger/accounts/status-counts').length;
    await waitFor(() => expect(accountCountReads()).toBe(1));

    groupsFail = false;
    fireEvent.click(within(groups).getByRole('button', { name: 'Retry' }));
    const table = await loadedTable(groups);
    expect(within(table).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Active', '2', 'Closed', '—']);
    expect(accountCountReads()).toBe(1);
  });

  it('that has not answered yet keeps the panel loading while its other read has answered', async () => {
    const fetchMock = stubLedger({ '/api/ledger/accounts/balances': () => new Promise<Response>(() => {}) });

    renderOverview();
    // The currencies have answered; the position has not.
    await waitFor(() => expect(fetched(fetchMock)).toContain('/api/ledger/currencies'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Its table keeps its headings over placeholder rows, and no loading line (DRK-1725 R1).
    const table = within(panel('Position by currency')).getByRole('table', { hidden: true });
    // A placeholder, not data: hidden from assistive technology and inert until the rows arrive.
    expect(table).toHaveAttribute('aria-hidden', 'true');
    expect(table).toHaveAttribute('inert');
    expect(within(table).getAllByRole('columnheader', { hidden: true }).map((header) => header.textContent)).toEqual(['Currency', 'Balance', 'Available', 'Held', 'Available and held']);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(table.querySelectorAll('tbody [data-slot="skeleton"]')).toHaveLength(15);
    expect(within(panel('Position by currency')).queryByText(/^Loading/)).toBeNull();
  });
});

describe('status counts', () => {
  it('list the 4 account statuses in order, from the service counts', async () => {
    stubLedger({ '/api/ledger/accounts/status-counts': { status: 200, text: '[{"status":"CLOSED","count":1},{"status":"DORMANT","count":0},{"status":"FROZEN","count":2},{"status":"ACTIVE","count":1200}]' } });

    renderOverview();

    const table = await loadedTable(panel('Accounts by status'));
    const rows = [...table.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['Active', '1,200'],
      ['Frozen', '2'],
      ['Dormant', '0'],
      ['Closed', '1'],
    ]);
  });

  it('match the service spelling in any case, and draw a status the service did not send as unknown, not 0', async () => {
    stubLedger({ '/api/ledger/account-groups/status-counts': { status: 200, text: '[{"type":"AccountGroupStatus","status":"active","count":1200}]' } });

    renderOverview();

    const table = await loadedTable(panel('Groups by status'));
    const rows = [...table.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['Active', '1,200'],
      ['Closed', '—'],
    ]);
  });
});

describe('the position', () => {
  it("draws a currency the currency list does not know with the service's own digits", async () => {
    stubLedger({ '/api/ledger/accounts/balances': { status: 200, text: '[{"currency":"XAU","balance":1.2345,"available":1.2,"held":0.0345}]' } });

    renderOverview();

    const table = await loadedTable(panel('Position by currency'));
    const cells = [...table.querySelectorAll('tbody td')].map((cell) => cell.textContent);
    expect(cells.slice(0, 4)).toEqual(['XAU', '1.2345', '1.2', '0.0345']);
  });

  it("draws each amount at its currency's own decimal places, not the digits the service wrote", async () => {
    stubLedger({ '/api/ledger/accounts/balances': { status: 200, text: '[{"currency":"SGD","balance":100,"available":99.5,"held":0.5}]' } });

    renderOverview();

    const table = await loadedTable(panel('Position by currency'));
    const cells = [...table.querySelectorAll('tbody td')].map((cell) => cell.textContent);
    expect(cells.slice(0, 4)).toEqual(['SGD', '100.00', '99.50', '0.50']);
  });

  it("draws each row's bar across the whole of its cell", async () => {
    stubLedger({ '/api/ledger/accounts/balances': { status: 200, text: '[{"currency":"SGD","balance":100.00,"available":75.00,"held":25.00}]' } });

    renderOverview();

    const bar = await within(panel('Position by currency')).findByRole('img', { name: 'SGD: 75% available, 25% held' });
    expect(bar.style.width).toBe('100%');
    expect([...bar.children].map((segment) => (segment as HTMLElement).style.width)).toEqual(['75%', '25%']);
  });

  it('draws a row with nothing available or held as an empty bar', async () => {
    stubLedger({ '/api/ledger/accounts/balances': { status: 200, text: '[{"currency":"SGD","balance":0.00,"available":0.00,"held":0.00}]' } });

    renderOverview();

    const bar = await within(panel('Position by currency')).findByRole('img', { name: 'SGD: 0% available, 0% held' });
    expect([...bar.children].map((segment) => (segment as HTMLElement).style.width)).toEqual(['0%', '0%']);
  });
});

/** The width each row's aria-hidden bar segments are drawn at. */
function barWidths(table: HTMLElement): string[][] {
  return [...table.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('[aria-hidden="true"]')].map((bar) => (bar as HTMLElement).style.width));
}

describe('the activity charts', () => {
  it('draw each week as a bar scaled to the busiest week', async () => {
    const fetchMock = stubLedger();
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/ledger/postings?')) {
        const from = new URLSearchParams(url.split('?')[1]).get('from');
        return Promise.resolve(new Response(`{"items":[],"totalItemCount":${from === '2026-09-18' ? 200 : from === '2026-09-11' ? 50 : 0}}`));
      }
      return Promise.resolve(new Response('[]'));
    });
    vi.useFakeTimers({ now: new Date('2026-09-24T10:00:00Z'), toFake: ['Date'] });

    renderOverview();

    const widths = barWidths(await loadedTable(panel('Postings per week')));
    vi.useRealTimers();
    expect(widths.at(-1)).toEqual(['100%']);
    expect(widths.at(-2)).toEqual(['25%']);
    expect(widths[0]).toEqual(['0%']);
  });

  it('draw each month as one segment per status, scaled to the largest count', async () => {
    const fetchMock = stubLedger();
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/ledger/accounts/status-counts?')) {
        const september = new URLSearchParams(url.split('?')[1]).get('from') === '2026-09-01T00:00:00.000Z';
        return Promise.resolve(new Response(september ? '[{"status":"ACTIVE","count":3},{"status":"CLOSED","count":1}]' : '[{"status":"ACTIVE","count":0}]'));
      }
      return Promise.resolve(new Response(url.startsWith('/api/ledger/postings') ? '{"items":[],"totalItemCount":0}' : '[]'));
    });
    vi.useFakeTimers({ now: new Date('2026-09-24T10:00:00Z'), toFake: ['Date'] });

    renderOverview();

    const table = await loadedTable(panel('Accounts opened per month'));
    vi.useRealTimers();
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual(['Month (UTC)', 'Active', 'Frozen', 'Dormant', 'Closed', 'By status']);
    expect(barWidths(table).at(-1)).toEqual(['25%', '0%', '0%', `${(1 / 12) * 100}%`]);
    const septemberRead = fetched(fetchMock).find((url) => url.includes('from=2026-09-01'))!;
    expect(new URLSearchParams(septemberRead.split('?')[1]).get('to')).toBe('2026-09-30T23:59:59.999Z');
  });

  it('draw no bar length when every figure is 0', async () => {
    stubLedger();

    renderOverview();

    const widths = barWidths(await loadedTable(panel('Postings per week')));
    expect(new Set(widths.flat())).toEqual(new Set(['0%']));
  });

  it('draw every week and month at 0 when nothing happened', async () => {
    stubLedger({ '/api/ledger/accounts/status-counts?': { status: 200, text: '[{"type":"AccountStatus","status":"ACTIVE","count":0}]' } });

    renderOverview();

    const weeks = await loadedTable(panel('Postings per week'));
    expect(weeks.querySelectorAll('tbody tr')).toHaveLength(13);
    const months = await loadedTable(panel('Accounts opened per month'));
    const firstMonth = [...months.querySelectorAll('tbody tr')[0].querySelectorAll('td')].map((cell) => cell.textContent);
    expect(firstMonth.slice(1, 5)).toEqual(['0', '—', '—', '—']);
  });
});

describe('recently viewed', () => {
  it('states an entry it could not read in its own line, and reads it again on Retry', async () => {
    storeRecent([{ kind: 'Account', id: ACCOUNT_ID }]);
    let fail = true;
    stubLedger({
      [`/api/ledger/accounts/${ACCOUNT_ID}`]: () =>
        Promise.resolve(
          fail
            ? new Response('{"errors":[{"message":"Ledger store unavailable"}]}', { status: 503 })
            : new Response(`{"id":"${ACCOUNT_ID}","accountNumber":"ACME-000123","name":"Acme Treasury"}`),
        ),
    });

    renderOverview();
    const entry = await waitFor(() => within(panel('Recently viewed')).getByRole('listitem'));
    expect(await within(entry).findByRole('alert')).toHaveTextContent('Ledger store unavailable');

    fail = false;
    fireEvent.click(within(entry).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(within(panel('Recently viewed')).getByRole('listitem')).toHaveTextContent('ACME-000123Acme Treasury'));
  });

  it('reads each record again and shows it as it is now, linked to where it opens', async () => {
    storeRecent([
      { kind: 'Account', id: ACCOUNT_ID },
      { kind: 'AccountGroup', id: GROUP_ID },
      { kind: 'Posting', id: POSTING_ID },
    ]);
    stubLedger({
      [`/api/ledger/accounts/${ACCOUNT_ID}`]: { status: 200, text: `{"id":"${ACCOUNT_ID}","accountNumber":"ACME-000123","name":"Acme Treasury"}` },
      [`/api/ledger/account-groups/${GROUP_ID}`]: { status: 200, text: `{"id":"${GROUP_ID}","code":"INITECH","name":"Initech"}` },
      [`/api/ledger/postings/${POSTING_ID}`]: { status: 200, text: `{"id":"${POSTING_ID}","postingNumber":"P-10042"}` },
    });

    renderOverview();

    const entries = await waitFor(() => {
      const items = within(panel('Recently viewed')).getAllByRole('listitem');
      expect(items[2]).toHaveTextContent('P-10042');
      return items;
    });
    expect(entries[0]).toHaveTextContent('ACME-000123Acme Treasury');
    expect(within(entries[0]).getByRole('link', { name: 'ACME-000123' })).toHaveAttribute('href', '/accounts/ACME-000123');
    expect(entries[1]).toHaveTextContent('INITECHInitech');
    expect(within(entries[1]).getByRole('link', { name: 'INITECH' })).toHaveAttribute('href', `/groups?open=${GROUP_ID}`);
    expect(within(entries[2]).getByRole('link', { name: 'P-10042' })).toHaveAttribute('href', `/records?open=${POSTING_ID}`);
  });

  it.each([
    ['Account', ACCOUNT_ID, `/api/ledger/accounts/${ACCOUNT_ID}`, 'This account can no longer be found.'],
    ['Posting', POSTING_ID, `/api/ledger/postings/${POSTING_ID}`, 'This posting can no longer be found.'],
  ])('says a %s that no longer exists can no longer be found', async (kind, id, path, statement) => {
    storeRecent([{ kind, id }]);
    stubLedger({ [path]: { status: 404, text: '{"errors":[{"message":"Not found."}]}' } });

    renderOverview();

    expect(await within(panel('Recently viewed')).findByText(statement)).toBeInTheDocument();
  });

  it('says the operator may no longer read a record the service refuses them', async () => {
    storeRecent([{ kind: 'AccountGroup', id: GROUP_ID }]);
    stubLedger({ [`/api/ledger/account-groups/${GROUP_ID}`]: { status: 403, text: '{"errors":[{"message":"Not permitted."}]}' } });

    renderOverview();

    const entry = within(panel('Recently viewed')).getByRole('listitem');
    expect(await within(entry).findByText('You may no longer read this group.')).toBeInTheDocument();
    expect(within(entry).getByText('requires accounts.read')).toBeInTheDocument();
  });

  it('says the operator may no longer read a record whose permission they lack, without reading it', async () => {
    storeRecent([{ kind: 'Posting', id: POSTING_ID }]);
    const fetchMock = stubLedger();

    renderOverview(['accounts.read']);

    const entry = within(panel('Recently viewed')).getByRole('listitem');
    expect(within(entry).getByText('You may no longer read this posting.')).toBeInTheDocument();
    expect(within(entry).getByText('requires postings.read')).toBeInTheDocument();
    await waitFor(() => expect(fetched(fetchMock).length).toBeGreaterThan(0));
    expect(fetched(fetchMock)).not.toContain(`/api/ledger/postings/${POSTING_ID}`);
  });

  it("states any other refusal in the entry's place", async () => {
    storeRecent([{ kind: 'Account', id: ACCOUNT_ID }]);
    stubLedger({ [`/api/ledger/accounts/${ACCOUNT_ID}`]: { status: 502, text: '{"errors":[{"message":"The ledger service is unavailable."}]}' } });

    renderOverview();

    expect(await within(panel('Recently viewed')).findByText(/The ledger service is unavailable\./)).toBeInTheDocument();
  });

  it('shows an entry loading until the service answers', () => {
    storeRecent([{ kind: 'Account', id: ACCOUNT_ID }]);
    stubLedger({ [`/api/ledger/accounts/${ACCOUNT_ID}`]: () => new Promise<Response>(() => {}) });

    renderOverview();

    const entry = within(panel('Recently viewed')).getByRole('listitem');
    expect(entry.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(entry).toHaveTextContent(/^$/);
  });

  it('draws no list on the server, which cannot see the browser', () => {
    storeRecent([{ kind: 'Account', id: ACCOUNT_ID }]);
    stubLedger();
    const queryClient = new QueryClient();

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <OverviewScreen grantedScopes={ALL_READS} directoryObjectId={MAI} />
      </QueryClientProvider>,
    );

    expect(html).toContain('Recently viewed');
    expect(html).not.toContain('Records you open will appear here.');
    expect(html).not.toContain('<li');
  });

  it('says records opened will appear here when the browser keeps no list', () => {
    vi.stubGlobal('localStorage', undefined);
    stubLedger();

    renderOverview();

    expect(within(panel('Recently viewed')).getByText('Records you open will appear here.')).toBeInTheDocument();
  });

  it('follows a change another tab makes to the list', async () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    stubLedger({ [`/api/ledger/accounts/${ACCOUNT_ID}`]: { status: 200, text: `{"id":"${ACCOUNT_ID}","accountNumber":"ACME-000123","name":"Acme"}` } });
    renderOverview();
    expect(within(panel('Recently viewed')).getByText('Records you open will appear here.')).toBeInTheDocument();

    storage.setItem(`recently-viewed:${MAI}`, JSON.stringify([{ kind: 'Account', id: ACCOUNT_ID, openedAt: '2026-09-24T10:00:00.000Z' }]));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage'));
    });

    expect(await within(panel('Recently viewed')).findByText('ACME-000123')).toBeInTheDocument();
  });
});

describe('the screen', () => {
  it('offers no action that records, changes or deletes anything', async () => {
    storeRecent([{ kind: 'Account', id: ACCOUNT_ID }]);
    stubLedger({ [`/api/ledger/accounts/${ACCOUNT_ID}`]: { status: 200, text: `{"id":"${ACCOUNT_ID}","accountNumber":"ACME-000123","name":"Acme"}` } });

    renderOverview(['accounts.read', 'accounts.write', 'postings.read', 'postings.write', 'postings.reverse']);

    await within(panel('Recently viewed')).findByText('ACME-000123');
    expect(screen.queryAllByRole('button')).toEqual([]);
  });
});
