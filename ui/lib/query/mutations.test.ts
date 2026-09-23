import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountBalanceKey, postingsListKey } from './keys';
import { useRecordPosting, useReversePosting } from './mutations';

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRecordPosting', () => {
  it('posts to /api/ledger/postings with the idempotency key header, invalidates the account balance and mints a new key on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const regenerateIdempotencyKey = vi.fn();
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
      regenerateIdempotencyKey,
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
    // pr-reviewer finding 3 (DRK-1687): the hook's own doc comment promises regeneration on
    // success — pinned here so a future edit that drops it fails loudly, not silently.
    expect(regenerateIdempotencyKey).toHaveBeenCalledTimes(1);
  });

  it('returns the service refusal unchanged, invalidates nothing and never mints a new key on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ errors: [{ message: 'The debit would take the account past its floor.', code: 'INSUFFICIENT_FUNDS' }], traceId: 't-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const regenerateIdempotencyKey = vi.fn();
    const { result } = renderHook(() => useRecordPosting(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({
      accountId: 'ACME-000123',
      direction: 'Debit',
      amount: '20000.00',
      currency: 'SGD',
      category: 'Transfer',
      idempotencyKey: 'key-2',
      regenerateIdempotencyKey,
    });

    expect(response).toEqual(
      expect.objectContaining({
        ok: false,
        errors: [{ message: 'The debit would take the account past its floor.', code: 'INSUFFICIENT_FUNDS' }],
        traceId: 't-1',
      }),
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(regenerateIdempotencyKey).not.toHaveBeenCalled();
  });
});

describe('useReversePosting', () => {
  it('posts to /api/ledger/postings/:id/reverse with the idempotency key header, invalidates postings and mints a new key on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const regenerateIdempotencyKey = vi.fn();
    const { result } = renderHook(() => useReversePosting(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({
      postingId: 'PST0000000001',
      accountId: 'ACME-000123',
      reason: 'Recorded in error',
      idempotencyKey: 'key-3',
      regenerateIdempotencyKey,
    });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/postings/PST0000000001/reverse', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': 'key-3' },
      body: JSON.stringify({ reason: 'Recorded in error' }),
    });
    // pr-reviewer finding 10 (DRK-1687, round 2): a reversal changes a balance too — it must
    // invalidate accountBalanceKey the same way useRecordPosting does, not postings alone.
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountBalanceKey('ACME-000123') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: postingsListKey({}) });
    expect(regenerateIdempotencyKey).toHaveBeenCalledTimes(1);
  });

  it('returns the service refusal unchanged and never mints a new key on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ errors: [{ message: 'Already reversed.', code: 'POSTING_ALREADY_REVERSED' }], traceId: 't-2' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const regenerateIdempotencyKey = vi.fn();
    const { result } = renderHook(() => useReversePosting(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({
      postingId: 'PST0000000001',
      accountId: 'ACME-000123',
      reason: 'Recorded in error',
      idempotencyKey: 'key-4',
      regenerateIdempotencyKey,
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(response).toEqual(
      expect.objectContaining({ ok: false, errors: [{ message: 'Already reversed.', code: 'POSTING_ALREADY_REVERSED' }], traceId: 't-2' }),
    );
    expect(regenerateIdempotencyKey).not.toHaveBeenCalled();
  });
});
