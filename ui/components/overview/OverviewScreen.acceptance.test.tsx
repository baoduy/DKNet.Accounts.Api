/**
 * DRK-1725 §5 — the @unit scenarios on the Overview screen, driven through `OverviewScreen` with
 * the pass-through (`fetch`) stubbed, the way `RecordsScreen.test.tsx` drives its screen:
 *
 *   Scenario Outline: The caption states the route before anything is sent
 *   Scenario: A search shorter than 2 characters is not sent
 *   Scenario: Each currency's bar is scaled to its own row
 *   Scenario: The position has no total across currencies
 *   Scenario: Weeks are counted in UTC
 *   Scenario: The screen names the insight it cannot show
 *
 * Control and panel names follow `tests/support/overview.ts`. A position bar is an element with
 * role `img`, named `<currency>: <n>% available, <n>% held`, whose child elements are its
 * segments, each drawn across its `style.width` percentage of the bar. RED today:
 * `OverviewScreen` is a stub that throws (brief §3 row 6).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { OverviewScreen } from './OverviewScreen';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

const SEARCH_LABEL = 'Search accounts, groups and postings';
const MAI_OBJECT_ID = '11111111-1111-4111-8111-111111111111';
const ALL_READS = ['accounts.read', 'postings.read'];

interface BalanceLine {
  currency: string;
  balance: string;
  available: string;
  held: string;
}

interface StubLedger {
  balances?: BalanceLine[];
  /** How many postings took effect in the window `from`..`to` (both `YYYY-MM-DD`, inclusive). */
  postingsIn?: (from: string, to: string) => number;
}

const CURRENCIES = [
  { id: 'c-sgd', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true },
  { id: 'c-usd', code: 'USD', name: 'US Dollar', decimalPlaces: 2, isActive: true },
  { id: 'c-jpy', code: 'JPY', name: 'Japanese Yen', decimalPlaces: 0, isActive: true },
];

/** A body as the service writes it: money as raw, unquoted JSON number literals. */
function textResponse(text: string, status = 200): { status: number; ok: boolean; text: () => Promise<string>; json: () => Promise<unknown> } {
  return { status, ok: status >= 200 && status < 300, text: async () => text, json: async () => JSON.parse(text) };
}

function jsonResponse(body: unknown, status = 200): ReturnType<typeof textResponse> {
  return textResponse(JSON.stringify(body), status);
}

function statusCounts(type: string, statuses: string[]): ReturnType<typeof textResponse> {
  return jsonResponse(statuses.map((status) => ({ type, status, count: 0 })));
}

function urlOf(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.pathname + input.search;
  return String((input as { url?: string }).url ?? input);
}

function stubLedger(ledger: StubLedger = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation((input: unknown) => {
    const url = urlOf(input);
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (path.startsWith('/api/ledger/currencies')) return Promise.resolve(jsonResponse(CURRENCIES));
    if (path.startsWith('/api/ledger/accounts/balances')) {
      const lines = (ledger.balances ?? []).map((l) => `{"currency":${JSON.stringify(l.currency)},"balance":${l.balance},"available":${l.available},"held":${l.held}}`);
      return Promise.resolve(textResponse(`[${lines.join(',')}]`));
    }
    if (path.startsWith('/api/ledger/accounts/status-counts')) return Promise.resolve(statusCounts('AccountStatus', ['ACTIVE', 'FROZEN', 'DORMANT', 'CLOSED']));
    if (path.startsWith('/api/ledger/account-groups/status-counts')) return Promise.resolve(statusCounts('AccountGroupStatus', ['ACTIVE', 'CLOSED']));
    if (path.startsWith('/api/ledger/postings?')) {
      const params = new URLSearchParams(path.split('?')[1]);
      const from = (params.get('from') ?? '').slice(0, 10);
      const to = (params.get('to') ?? '').slice(0, 10);
      const total = ledger.postingsIn ? ledger.postingsIn(from, to) : 0;
      return Promise.resolve(textResponse(`{"items":[],"pageNumber":1,"pageSize":1,"pageCount":1,"totalItemCount":${total},"hasNextPage":false,"hasPreviousPage":false}`));
    }
    return Promise.resolve(jsonResponse({ status: 404, errors: [{ message: `unexpected fetch: ${url}` }] }, 404));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderOverview(grantedScopes: string[] = ALL_READS): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(OverviewScreen, { grantedScopes, directoryObjectId: MAI_OBJECT_ID })));
}

/** Every request that searched or looked a record up: an accounts or groups list, or a read of one record. */
function searchCalls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => urlOf(input))
    .filter((url) => /\/api\/ledger\/(accounts|account-groups)\?|\/api\/ledger\/(accounts|account-groups|postings)\/(?!balances|status-counts)[^/?]+$|search=/.test(url));
}

/** A position bar's segments (its child elements), as the percentage of the bar each is drawn across. */
function segmentWidths(bar: HTMLElement): number[] {
  return [...bar.children].map((segment) => Number.parseFloat((segment as HTMLElement).style.width));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Each body row of `container`'s table as its cells' text. */
function bodyRows(container: HTMLElement): string[][] {
  const table = within(container).getByRole('table');
  return [...table.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('th, td')].map((cell) => (cell.textContent ?? '').trim()));
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage?.clear();
});

describe('The caption states the route before anything is sent', () => {
  const EXAMPLES = [
    { typed: '6d1e4f0a-2b3c-4d5e-8f90-a1b2c3d4e5f6', caption: 'Looked up as an account, then a group, then a posting.' },
    { typed: 'ACME-000123', caption: 'Matched as an account number.' },
    { typed: 'Acme', caption: 'Searched across accounts and groups.' },
  ];

  for (const { typed, caption } of EXAMPLES) {
    it(`says "${caption}" for "${typed}"`, async () => {
      const fetchMock = stubLedger();
      const user = userEvent.setup();
      renderOverview();

      await user.type(screen.getByRole('searchbox', { name: SEARCH_LABEL }), typed);

      expect(await screen.findByText(caption, { exact: true })).toBeInTheDocument();
      expect(searchCalls(fetchMock)).toEqual([]);
    });
  }
});

describe('A search shorter than 2 characters is not sent', () => {
  it('sends nothing for "A" and says a search needs at least 2 characters', async () => {
    const fetchMock = stubLedger();
    const user = userEvent.setup();
    renderOverview();

    await user.type(screen.getByRole('searchbox', { name: SEARCH_LABEL }), 'A{Enter}');

    expect(await screen.findByText('A search needs at least 2 characters.', { exact: true })).toBeInTheDocument();
    expect(searchCalls(fetchMock)).toEqual([]);
  });
});

describe("Each currency's bar is scaled to its own row", () => {
  it('shows SGD 96% available and 4% held, JPY 100% available, both the same full length', async () => {
    stubLedger({
      balances: [
        { currency: 'SGD', balance: '1250.50', available: '1200.50', held: '50.00' },
        { currency: 'JPY', balance: '500000', available: '500000', held: '0' },
      ],
    });
    renderOverview();

    const position = await screen.findByRole('region', { name: 'Position by currency' });
    const sgd = await within(position).findByRole('img', { name: 'SGD: 96% available, 4% held' });
    const jpy = await within(position).findByRole('img', { name: 'JPY: 100% available, 0% held' });
    // Scaled to its own row: each bar's segments fill all of it, and neither bar is drawn shorter
    // because the other currency's balance is larger.
    const [sgdAvailable, sgdHeld] = segmentWidths(sgd);
    expect(Math.round(sgdAvailable)).toBe(96);
    expect(Math.round(sgdHeld)).toBe(4);
    expect(sum(segmentWidths(sgd))).toBeCloseTo(100, 6);
    expect(segmentWidths(jpy)[0]).toBe(100);
    expect(sum(segmentWidths(jpy))).toBeCloseTo(100, 6);
    expect(sgd.style.width).toBe(jpy.style.width);
  });
});

describe('The position has no total across currencies', () => {
  it('lists SGD and USD, no total, and says why', async () => {
    stubLedger({
      balances: [
        { currency: 'SGD', balance: '100.00', available: '100.00', held: '0.00' },
        { currency: 'USD', balance: '200.00', available: '200.00', held: '0.00' },
      ],
    });
    renderOverview();

    const position = await screen.findByRole('region', { name: 'Position by currency' });
    await waitFor(() => expect(bodyRows(position).map((cells) => cells[0])).toEqual(['SGD', 'USD']));
    expect(within(position).queryByText(/total/i)).toBeNull();
    expect(within(position).queryByText('300.00')).toBeNull();
    expect(within(position).getByText('Balances in different currencies are never added together.', { exact: true })).toBeInTheDocument();
  });
});

describe('Weeks are counted in UTC', () => {
  let savedTimeZone: string | undefined;

  beforeAll(() => {
    savedTimeZone = process.env.TZ;
    process.env.TZ = 'Asia/Singapore';
  });

  afterAll(() => {
    if (savedTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = savedTimeZone;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts a posting effective 2026-09-17 (UTC) in the week 2026-09-11 to 2026-09-17, on a Singapore computer', async () => {
    // 20:00 UTC on 2026-09-24 is already 04:00 on 2026-09-25 in Singapore: a week counted on
    // the computer's own clock would end on the 25th and hold the posting in 2026-09-12 to 2026-09-18.
    vi.useFakeTimers({ now: new Date('2026-09-24T20:00:00Z'), toFake: ['Date'] });
    expect(new Date().getDate()).toBe(25);
    stubLedger({ postingsIn: (from, to) => (from <= '2026-09-17' && '2026-09-17' <= to ? 1 : 0) });
    renderOverview();

    const chart = await screen.findByRole('region', { name: 'Postings per week' });
    await waitFor(() => expect(bodyRows(chart)).toHaveLength(13));
    const rows = bodyRows(chart);
    expect(rows.find((cells) => cells[0] === '2026-09-11 to 2026-09-17')?.at(-1)).toBe('1');
    expect(rows.find((cells) => cells[0] === '2026-09-18 to 2026-09-24')?.at(-1)).toBe('0');
    expect(rows.at(-1)?.[0]).toBe('2026-09-18 to 2026-09-24');
  });
});

describe('The screen names the insight it cannot show', () => {
  it('says a total across all currencies is not shown, because the service has no exchange-rate source', async () => {
    stubLedger();
    renderOverview();

    expect(
      await screen.findByText('A total across all currencies is not shown, because the service has no exchange-rate source and currencies are never added together.', { exact: true }),
    ).toBeInTheDocument();
  });
});
