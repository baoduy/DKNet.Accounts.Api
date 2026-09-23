import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountBalanceKey, postingsListKey } from './keys';
import { useRecordPosting } from './mutations';

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRecordPosting', () => {
  it('posts to /api/ledger/postings with the idempotency key header and invalidates the account balance on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRecordPosting(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({
      accountId: 'ACME-000123',
      direction: 'Credit',
      amount: '10.00',
      currency: 'SGD',
      category: 'Transfer',
      description: 'a note',
      effectiveDate: '2026-09-01',
      idempotencyKey: 'key-1',
    });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/postings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': 'key-1' },
      body: JSON.stringify({
        accountId: 'ACME-000123',
        direction: 'Credit',
        amount: '10.00',
        currency: 'SGD',
        category: 'Transfer',
        description: 'a note',
        effectiveDate: '2026-09-01',
      }),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountBalanceKey('ACME-000123') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: postingsListKey({}) });
  });

  it('returns the service refusal unchanged and invalidates nothing on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ errors: [{ message: 'The debit would take the account past its floor.', code: 'INSUFFICIENT_FUNDS' }], traceId: 't-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRecordPosting(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({
      accountId: 'ACME-000123',
      direction: 'Debit',
      amount: '20000.00',
      currency: 'SGD',
      category: 'Transfer',
      idempotencyKey: 'key-2',
    });

    expect(response).toEqual(
      expect.objectContaining({
        ok: false,
        errors: [{ message: 'The debit would take the account past its floor.', code: 'INSUFFICIENT_FUNDS' }],
        traceId: 't-1',
      }),
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
