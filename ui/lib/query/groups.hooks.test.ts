/**
 * DRK-1760 §3 row 3 — the group read hooks: one cached copy per page, per group and per group's
 * balances, and no read at all while nothing asks for one.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAccountGroup, useAccountGroupBalances, useAccountGroupsPage } from './groups';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children);
}

function stubLedger(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string) => {
    const balances = url.match(/^\/api\/ledger\/account-groups\/(\w+)\/balances$/);
    if (balances) return new Response(JSON.stringify([{ currency: balances[1] === 'g1' ? 'SGD' : 'JPY', balance: '1', available: '1', held: '0' }]));
    const group = url.match(/^\/api\/ledger\/account-groups\/(\w+)$/);
    if (group) return new Response(JSON.stringify({ id: group[1], code: group[1].toUpperCase() }));
    const page = new URLSearchParams(url.split('?')[1]).get('pageNumber');
    return new Response(JSON.stringify({ items: [{ id: `page-${page}` }], pageNumber: page, pageSize: 10, pageCount: 2, totalItemCount: 11, hasNextPage: page === '1' }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAccountGroupsPage', () => {
  it('reads each page on its own', async () => {
    stubLedger();
    const { result, rerender } = renderHook(({ page }) => useAccountGroupsPage({ filters: {}, page, pageSize: 10 }), { wrapper, initialProps: { page: 1 } });
    await waitFor(() => expect(result.current.data?.items).toEqual([{ id: 'page-1' }]));

    rerender({ page: 2 });

    await waitFor(() => expect(result.current.data?.items).toEqual([{ id: 'page-2' }]));
  });
});

describe('useAccountGroup', () => {
  it('reads nothing while no group is open', async () => {
    const fetchMock = stubLedger();
    const { result } = renderHook(() => useAccountGroup(null), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the open group', async () => {
    stubLedger();
    const { result } = renderHook(() => useAccountGroup('g1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ id: 'g1', code: 'G1' }));
  });
});

describe('useAccountGroupBalances', () => {
  it("reads each group's own balances", async () => {
    stubLedger();
    const { result, rerender } = renderHook(({ id }) => useAccountGroupBalances(id, true), { wrapper, initialProps: { id: 'g1' } });
    await waitFor(() => expect(result.current.data?.[0].currency).toBe('SGD'));

    rerender({ id: 'g2' });

    await waitFor(() => expect(result.current.data?.[0].currency).toBe('JPY'));
  });

  it.each([
    { id: null, enabled: true },
    { id: 'g1', enabled: false },
  ])('reads nothing for group $id while enabled is $enabled', async ({ id, enabled }) => {
    const fetchMock = stubLedger();
    renderHook(() => useAccountGroupBalances(id, enabled), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
