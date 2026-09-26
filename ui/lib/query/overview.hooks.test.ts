/** DRK-1760 §3 row 3 — `useListTotal` holds its last answer only when asked to. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useListTotal, useListTotals, usePostingCounts, useRecordLookups, useStatusCountsPerWindow } from './overview';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The first read answers at once; every later one is held, so a changed read stays outstanding. */
function stubLedger(): void {
  let calls = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (calls++ === 0 ? Promise.resolve(new Response('{"totalItemCount":4}')) : new Promise<Response>(() => undefined))),
  );
}

describe('useListTotal', () => {
  it('draws nothing for a changed read until it answers, by default', async () => {
    stubLedger();
    const { result, rerender } = renderHook(({ fromDate }) => useListTotal('account-groups', { fromDate }, { enabled: true }), { wrapper, initialProps: { fromDate: 'a' } });
    await waitFor(() => expect(result.current.data).toBe(4));

    rerender({ fromDate: 'b' });

    await waitFor(() => expect(result.current.data).toBeUndefined());
  });

  it('keeps the last answer drawn while a changed read is outstanding, when asked to', async () => {
    stubLedger();
    const { result, rerender } = renderHook(({ fromDate }) => useListTotal('account-groups', { fromDate }, { enabled: true, keepPrevious: true }), {
      wrapper,
      initialProps: { fromDate: 'a' },
    });
    await waitFor(() => expect(result.current.data).toBe(4));

    rerender({ fromDate: 'b' });

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data).toBe(4);
  });
});

describe('the per-window and per-record hooks (DRK-1762 finding 2)', () => {
  /** Answers each read with a figure taken from its own query, so each result can be traced to its read. */
  function stubCounts(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async (url: string) => {
      const [path, query = ''] = url.split('?');
      const params = new URLSearchParams(query);
      if (path.endsWith('/status-counts')) return new Response(JSON.stringify([{ status: 'ACTIVE', count: params.get('from') === '2026-08-01T00:00:00.000Z' ? 3 : 5 }]));
      if (path === '/api/ledger/postings') return new Response(JSON.stringify({ totalItemCount: params.get('from') === '2026-09-01' ? 12 : 30 }));
      if (path === '/api/ledger/account-groups') return new Response(JSON.stringify({ totalItemCount: params.get('filter') === 'Type:Equal:Customer' ? 7 : 2 }));
      if (path === '/api/ledger/postings/p-404') return new Response('', { status: 404 });
      if (path.startsWith('/api/ledger/accounts/')) return new Response(JSON.stringify({ id: path.split('/').pop(), accountNumber: 'ACME-000123' }));
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('useStatusCountsPerWindow reads each window on its own, in order', async () => {
    const fetchMock = stubCounts();
    const windows = [
      { from: '2026-08-01T00:00:00.000Z', to: '2026-08-31T23:59:59.999Z', label: 'August 2026' },
      { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z', label: 'September 2026' },
    ];
    const { result } = renderHook(() => useStatusCountsPerWindow('accounts', windows, true), { wrapper });

    await waitFor(() => expect(result.current.map((read) => read.data)).toEqual([[{ status: 'ACTIVE', count: 3 }], [{ status: 'ACTIVE', count: 5 }]]));
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      '/api/ledger/accounts/status-counts?from=2026-08-01T00%3A00%3A00.000Z&to=2026-08-31T23%3A59%3A59.999Z',
      '/api/ledger/accounts/status-counts?from=2026-09-01T00%3A00%3A00.000Z&to=2026-09-30T23%3A59%3A59.999Z',
    ]);
  });

  it('usePostingCounts reads each window on its own, in order', async () => {
    stubCounts();
    const { result } = renderHook(() => usePostingCounts([{ from: '2026-09-01', to: '2026-09-07' }, { from: '2026-09-08', to: '2026-09-14' }], true), { wrapper });

    await waitFor(() => expect(result.current.map((read) => read.data)).toEqual([12, 30]));
  });

  it('useListTotals reads the total under each set of params', async () => {
    stubCounts();
    const { result } = renderHook(() => useListTotals('account-groups', [{ filter: 'Type:Equal:Customer' }, { filter: 'Type:Equal:Internal' }], true), { wrapper });

    await waitFor(() => expect(result.current.map((read) => read.data)).toEqual([7, 2]));
  });

  it('useRecordLookups reads each record it may read, and only those', async () => {
    const fetchMock = stubCounts();
    const { result } = renderHook(
      () =>
        useRecordLookups([
          { kind: 'Account', id: 'a1', path: '/api/ledger/accounts/a1', enabled: true },
          { kind: 'Posting', id: 'p-404', path: '/api/ledger/postings/p-404', enabled: true },
          { kind: 'AccountGroup', id: 'g1', path: '/api/ledger/account-groups/g1', enabled: false },
        ]),
      { wrapper },
    );

    await waitFor(() => expect(result.current[1].data).toEqual({ state: 'notFound' }));
    expect(result.current[0].data).toEqual({ state: 'found', record: { id: 'a1', accountNumber: 'ACME-000123' } });
    expect(result.current[2].fetchStatus).toBe('idle');
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain('/api/ledger/account-groups/g1');
  });

  it.each<[string, () => unknown]>([
    ['useStatusCountsPerWindow', () => useStatusCountsPerWindow('accounts', [{ from: 'a', to: 'b' }], false)],
    ['usePostingCounts', () => usePostingCounts([{ from: 'a', to: 'b' }], false)],
    ['useListTotals', () => useListTotals('account-groups', [{}], false)],
  ])('%s reads nothing without the permission', async (_name, hook) => {
    const fetchMock = stubCounts();
    renderHook(hook, { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
