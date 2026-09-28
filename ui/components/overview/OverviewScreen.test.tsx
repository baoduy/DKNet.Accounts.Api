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

const OTHER_ID = 'a0000000-0000-4000-8000-000000000999';

function storeRecent(entries: Array<{ kind: string; id: string }>): void {
  const stored = entries.map((entry) => ({ ...entry, openedAt: '2026-09-24T10:00:00.000Z' }));
  vi.stubGlobal('localStorage', memoryStorage({ [`recently-viewed:${MAI}`]: JSON.stringify(stored) }));
}

function renderOverview(grantedScopes: string[] = ALL_READS): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OverviewScreen grantedScopes={grantedScopes} directoryObjectId={MAI} />
    </QueryClientProvider>,
  );
}

function panel(name: string): HTMLElement {
  return screen.getByRole('region', { name });
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

describe('the position', () => {

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
    storeRecent([{ kind, id }, { kind: 'Account', id: OTHER_ID }]);
    stubLedger({
      [path]: { status: 404, text: '{"errors":[{"message":"Not found."}]}' },
      [`/api/ledger/accounts/${OTHER_ID}`]: { status: 200, text: `{"id":"${OTHER_ID}","accountNumber":"ACME-000999","name":"Acme Other"}` },
    });

    const view = renderOverview();

    expect(await within(panel('Recently viewed')).findByText(statement)).toBeInTheDocument();
    await waitFor(() => expect(within(panel('Recently viewed')).getAllByRole('listitem')[1]).toHaveTextContent('ACME-000999'));
    // Said once, in place: still listed while Overview is open, gone once the operator leaves it.
    expect(within(panel('Recently viewed')).getByText(statement)).toBeInTheDocument();
    view.unmount();
    expect(JSON.parse(localStorage.getItem(`recently-viewed:${MAI}`)!).map((entry: { id: string }) => entry.id)).toEqual([OTHER_ID]);
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
