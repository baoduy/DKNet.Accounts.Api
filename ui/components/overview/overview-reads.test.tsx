/**
 * DRK-1760 §3 rows 3, 4 — the Overview panels read through the named hooks of
 * `lib/query/overview.ts`, one key per read: each figure drawn is the service's own count.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupTypeBars } from './GroupTypeBars';
import { HeadlineTiles } from './HeadlineTiles';
import { StatusRing } from './StatusRing';

const TYPE_COUNTS: Record<string, number> = { Customer: 5, Merchant: 2, Internal: 1, Suspense: 0, Settlement: 1 };

function answer(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function total(count: number): Response {
  return answer({ items: [], totalItemCount: count });
}

/** `holdWindowed` holds every activity-window read (a posting count, a group total `fromDate`) after the first of each. */
function stubLedger({ holdWindowed = false } = {}): ReturnType<typeof vi.fn> {
  const answered = new Set<string>();
  const fetchMock = vi.fn(async (url: string) => {
    const [path, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    const windowed = path === '/api/ledger/postings' ? 'postings' : params.has('fromDate') ? 'groups' : null;
    if (holdWindowed && windowed) {
      if (answered.has(windowed)) return new Promise<Response>(() => undefined);
      answered.add(windowed);
    }
    if (path === '/api/ledger/accounts/status-counts')
      return answer([
        { status: 'ACTIVE', count: 7 },
        { status: 'DORMANT', count: 2 },
        { status: 'FROZEN', count: 1 },
        { status: 'CLOSED', count: 0 },
      ]);
    if (path === '/api/ledger/account-groups/status-counts')
      return answer([
        { status: 'ACTIVE', count: 3 },
        { status: 'CLOSED', count: 1 },
      ]);
    if (path === '/api/ledger/accounts') return total(params.get('filter') === 'Status:In:Dormant,Frozen' ? 3 : 10);
    if (path === '/api/ledger/account-groups') {
      const type = params.get('filter')?.match(/^Type:Equal:(\w+)$/)?.[1];
      return total(type ? TYPE_COUNTS[type] : params.has('fromDate') ? 2 : 4);
    }
    if (path === '/api/ledger/currencies') return total(3);
    if (path === '/api/ledger/postings') return total(42);
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPanel(panel: ReactElement): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(createElement(QueryClientProvider, { client: queryClient }, panel));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('StatusRing', () => {
  it("draws the service's count per status around the service's account total", async () => {
    stubLedger();
    renderPanel(createElement(StatusRing, { granted: true }));

    expect(await screen.findByRole('img', { name: 'Accounts by status: Active 7 (70.0%), Dormant 2 (20.0%), Frozen 1 (10.0%), Closed 0 (0.0%)' })).toBeInTheDocument();
    expect(await screen.findByText('10 accounts across 4 groups.')).toBeInTheDocument();
  });

  it('reads nothing without accounts.read', () => {
    const fetchMock = stubLedger();
    renderPanel(createElement(StatusRing, { granted: false }));

    expect(screen.getByText('accounts.read', { exact: false })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('GroupTypeBars', () => {
  it("draws the service's count per group type, and the active and closed counts", async () => {
    stubLedger();
    renderPanel(createElement(GroupTypeBars, { granted: true }));

    expect(await screen.findByRole('img', { name: 'Customer: 5 groups' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Suspense: 0 groups' })).toBeInTheDocument();
    expect(await screen.findByText('3 active · 1 closed')).toBeInTheDocument();
  });

  it('reads nothing without accounts.read', () => {
    const fetchMock = stubLedger();
    renderPanel(createElement(GroupTypeBars, { granted: false }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('HeadlineTiles', () => {
  const NOW = new Date('2026-09-26T08:00:00Z');

  it("draws each tile from the service's totals and counts, each read once", async () => {
    const fetchMock = stubLedger();
    renderPanel(createElement(HeadlineTiles, { canReadAccounts: true, canReadPostings: true, activity: '30', now: NOW }));

    const tile = (label: string) => screen.getByRole('region', { name: label });
    expect(await within(tile('Accounts')).findByText('10')).toBeInTheDocument();
    expect(within(tile('Accounts')).getByText('42 postings in the last 30 days · 7 active')).toBeInTheDocument();
    expect(await within(tile('Account groups')).findByText('4')).toBeInTheDocument();
    expect(within(tile('Account groups')).getByText('2 with activity in the last 30 days · 1 closed')).toBeInTheDocument();
    expect(await within(tile('Currencies')).findByText('3')).toBeInTheDocument();
    expect(await within(tile('Needs attention')).findByText('3')).toBeInTheDocument();
    expect(within(tile('Needs attention')).getByText('2 dormant · 1 frozen —', { exact: false })).toBeInTheDocument();

    const statusReads = fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url === '/api/ledger/accounts/status-counts');
    expect(statusReads).toHaveLength(1);
  });

  it("keeps the last window's activity lines drawn while the next window is read", async () => {
    stubLedger({ holdWindowed: true });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tiles = (activity: '30' | '7') => createElement(QueryClientProvider, { client: queryClient }, createElement(HeadlineTiles, { canReadAccounts: true, canReadPostings: true, activity, now: NOW }));
    const { rerender } = render(tiles('30'));
    const groups = screen.getByRole('region', { name: 'Account groups' });
    expect(await within(groups).findByText('2 with activity in the last 30 days · 1 closed')).toBeInTheDocument();

    rerender(tiles('7'));

    expect(await within(groups).findByText('2 with activity in the last 7 days · 1 closed')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Accounts' })).getByText('42 postings in the last 7 days · 7 active')).toBeInTheDocument();
  });

  it('states the posting read as not permitted without postings.read, and reads no posting', async () => {
    const fetchMock = stubLedger();
    renderPanel(createElement(HeadlineTiles, { canReadAccounts: true, canReadPostings: false, activity: 'all', now: NOW }));

    expect(await within(screen.getByRole('region', { name: 'Account groups' })).findByText('2 with activity at any time · 1 closed')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/ledger/postings'))).toBe(false);
  });
});
