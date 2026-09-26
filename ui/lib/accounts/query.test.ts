import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCurrencies } from '@/lib/query/currencies';
import { useAccountGroups } from '@/lib/query/groups';
import { useAccount, useAccountBalance, useAccounts, usePostings } from './query';
import { defaultPostingsFilter } from './postings-filter';

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

function jsonResponse(body: unknown, status = 200): { status: number; ok: boolean; text: () => Promise<string> } {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAccounts', () => {
  it('fetches the paged list through the pass-through, parsed with parseLedgerJson', async () => {
    const page = { items: [{ accountNumber: 'ACME-000001', balance: '100.00' }], pageNumber: 1, pageSize: 20, pageCount: 1, totalItemCount: 1 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(page));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAccounts({ filters: {} }), { wrapper: wrapper(queryClient) });

    // parseLedgerJson reads every numeric literal back as text (R1) — pageNumber/pageCount
    // included, not only money fields.
    await waitFor(() =>
      expect(result.current.data).toEqual({
        items: page.items,
        pageNumber: '1',
        pageSize: '20',
        pageCount: '1',
        totalItemCount: '1',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/ledger/accounts?pageNumber=1'));
  });

  it('makes no call for a search term under the minimum length', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAccounts({ filters: { search: 'a' } }), { wrapper: wrapper(queryClient) });

    expect(fetchMock).not.toHaveBeenCalled();
    // `fetchStatus` (not just "fetch was never called") — an `enabled: true` mutant still
    // never reaches `fetch` (it throws on `null!.toString()` first), so it alone can't tell
    // a truly disabled query from one that crashed before the network call.
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useAccount', () => {
  it('reads a guid id directly and reports it found', async () => {
    const account = { id: '11111111-1111-4111-8111-111111111111', accountNumber: 'ACME-000123' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(account));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAccount('11111111-1111-4111-8111-111111111111'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.data).toEqual({ found: true, account }));
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/11111111-1111-4111-8111-111111111111');
  });

  it('resolves a non-guid via filter=AccountNumber:Equal:<value>', async () => {
    const account = { id: 'a1', accountNumber: 'ACME-000123' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [account] }));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAccount('ACME-000123'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.data).toEqual({ found: true, account }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('filter=AccountNumber%3AEqual%3AACME-000123'));
  });

  it('reports a guid id the service returns 404 for as not found — never the first row', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 404, ok: false, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAccount('11111111-1111-4111-8111-111111111111'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.data).toEqual({ found: false }));
  });

  it('reports an account number matching no row as not found — never the first row', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAccount('ACME-999999'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.data).toEqual({ found: false }));
  });
});

describe('useAccountGroups', () => {
  it('fetches the account groups list, unwrapping the paged envelope', async () => {
    const groups = [{ id: 'g1', code: 'ACME', name: 'ACME' }];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: groups }));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAccountGroups(), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.data).toEqual(groups));
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/account-groups');
  });
});

describe('useAccountBalance', () => {
  it('fetches the account balance, keyed for the write hooks to invalidate', async () => {
    const balance = { currency: 'SGD', balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', floor: '0.00' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(balance));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAccountBalance('a1'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.data).toEqual(balance));
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/a1/balance');
  });

  it('makes no call for an empty account id', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    renderHook(() => useAccountBalance(''), { wrapper: wrapper(queryClient) });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('usePostings', () => {
  it('narrows postings to the account and the period', async () => {
    const page = { items: [{ id: 'p1', postingNumber: 'PST0000000001' }], pageIndex: 0, pageSize: 20, pageCount: 1, hasNextPage: false };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(page));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const filter = defaultPostingsFilter(new Date('2026-09-24'));
    const { result } = renderHook(() => usePostings('a1', filter), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.data).toEqual({ ...page, pageIndex: '0', pageSize: '20', pageCount: '1' }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/ledger/postings?accountId=a1'));
  });

  it('makes no call for a period over 90 days', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => usePostings('a1', { from: '2026-01-01', to: '2026-06-01', direction: '', category: '', status: '' }), {
      wrapper: wrapper(queryClient),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('makes no call for an empty account id, even with an acceptable period', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const filter = defaultPostingsFilter(new Date('2026-09-24'));
    const { result } = renderHook(() => usePostings('', filter), { wrapper: wrapper(queryClient) });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('keys two different filters into two distinct cache entries, never one shared {}', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(jsonResponse({ items: [{ id: url.includes('Credit') ? 'credit' : 'debit' }], pageIndex: 0, pageSize: 1, pageCount: 1, hasNextPage: false })),
    );
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const filter = defaultPostingsFilter(new Date('2026-09-24'));
    const { result: creditResult } = renderHook(() => usePostings('a1', { ...filter, direction: 'Credit' }), { wrapper: wrapper(queryClient) });
    const { result: debitResult } = renderHook(() => usePostings('a1', { ...filter, direction: 'Debit' }), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(creditResult.current.data?.items[0]).toEqual({ id: 'credit' }));
    await waitFor(() => expect(debitResult.current.data?.items[0]).toEqual({ id: 'debit' }));
  });
});

describe('useCurrencies', () => {
  it('fetches the currency list through the one shared currencies query (DRK-1704 finding 9)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCurrencies(), { wrapper: wrapper(queryClient) });

    // `fetchCurrencies` (lib/query/currencies.ts) routes `decimalPlaces` back through `Number`
    // deliberately — it is a small int, not a money figure (R1 draws that line at money only).
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]));
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/currencies');
  });
});

describe('a refused read throws instead of being mistaken for empty or not-found (DRK-1704 finding 5)', () => {
  it('useAccount throws the service refusal for a non-404 failure on a guid lookup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 401, errors: [{ message: 'Not signed in.' }] }, 401));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAccount('11111111-1111-4111-8111-111111111111'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Not signed in.');
  });

  it('useAccount throws the service refusal for a failure on an account-number lookup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 500, errors: [{ message: 'Internal error.' }] }, 500));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAccount('ACME-000123'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Internal error.');
  });

  it('useAccounts throws the service refusal instead of rendering an empty list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 401, errors: [{ message: 'Not signed in.' }] }, 401));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAccounts({ filters: {} }), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Not signed in.');
  });
});
