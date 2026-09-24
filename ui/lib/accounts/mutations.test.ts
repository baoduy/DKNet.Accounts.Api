import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountKeyPrefix, accountsListKey } from '@/lib/query/keys';
import { useChangeAccountDetails, useOpenAccount, useSetAccountControls } from './mutations';

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useOpenAccount', () => {
  it('posts to /api/ledger/accounts and invalidates the accounts list on success', async () => {
    const account = { id: 'a1', accountNumber: 'ACME-000001' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(account) });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useOpenAccount(), { wrapper: wrapper(queryClient) });

    const input = { groupId: 'g1', name: 'Operating account', currency: 'SGD', classification: 'Asset', permittedToGoNegative: false };
    const response = await result.current.mutate(input);

    expect(response).toEqual({ ok: true, account });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountsListKey({}) }));
  });

  it('returns the service refusal unchanged and invalidates nothing on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ errors: [{ message: 'An overdraft limit is required.', code: 'OVERDRAFT_LIMIT_REQUIRED' }], traceId: 't-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useOpenAccount(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({
      groupId: 'g1',
      name: 'Operating account',
      currency: 'SGD',
      classification: 'Asset',
      permittedToGoNegative: true,
    });

    expect(response).toEqual({
      ok: false,
      errors: [{ message: 'An overdraft limit is required.', code: 'OVERDRAFT_LIMIT_REQUIRED' }],
      traceId: 't-1',
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useChangeAccountDetails', () => {
  it('puts to /api/ledger/accounts/:id and invalidates the account and the list on success', async () => {
    const account = { id: 'a1', accountNumber: 'ACME-000123', name: 'New name' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(account) });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useChangeAccountDetails(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ accountId: 'ACME-000123', name: 'New name' });

    expect(response).toEqual({ ok: true, account });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/ACME-000123', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New name', metadata: undefined }),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountKeyPrefix() }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountsListKey({}) });
  });

  it('invalidates nothing on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => JSON.stringify({ errors: [{ message: 'Not found.' }], traceId: 't-2' }) });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useChangeAccountDetails(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ accountId: 'ACME-000123', name: 'New name' });

    expect(response.ok).toBe(false);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('carries metadata through unchanged (DRK-1704 finding 4 — notes ride in metadata.notes)', async () => {
    const account = { id: 'a1', accountNumber: 'ACME-000123', name: 'Operating account', metadata: { notes: 'Reconciled monthly' } };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(account) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useChangeAccountDetails(), { wrapper: wrapper(new QueryClient()) });
    await result.current.mutate({ accountId: 'ACME-000123', metadata: { notes: 'Reconciled monthly' } });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.metadata).toEqual({ notes: 'Reconciled monthly' });
  });

  it('keeps a returned balance past Number.MAX_SAFE_INTEGER as text, never routed through Number (R1)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"id":"a1","accountNumber":"ACME-000123","balance":9007199254740993.75}' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useChangeAccountDetails(), { wrapper: wrapper(new QueryClient()) });
    const response = await result.current.mutate({ accountId: 'ACME-000123', name: 'x' });

    expect(response.account?.balance).toBe('9007199254740993.75');
  });
});

describe('useSetAccountControls', () => {
  it('patches to /api/ledger/accounts/:id and invalidates the account and the list on success', async () => {
    const account = { id: 'a1', accountNumber: 'ACME-000123', status: 'Closed' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(account) });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSetAccountControls(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ accountId: 'ACME-000123', status: 'Closed' });

    expect(response).toEqual({ ok: true, account });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/ACME-000123', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'Closed', overdraftLimit: undefined, minimumBalance: undefined, permittedToGoNegative: undefined }),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountKeyPrefix() }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountsListKey({}) });
  });

  it('returns the refusal unchanged and invalidates nothing on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ errors: [{ message: 'The account holds a balance.', code: 'ACCOUNT_HOLDS_BALANCE' }], traceId: 't-3' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSetAccountControls(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ accountId: 'ACME-000123', status: 'Closed' });

    expect(response).toEqual({
      ok: false,
      errors: [{ message: 'The account holds a balance.', code: 'ACCOUNT_HOLDS_BALANCE' }],
      traceId: 't-3',
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('reports no errors and no traceId, never throwing, on a failure with an empty body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSetAccountControls(), { wrapper: wrapper(new QueryClient()) });
    const response = await result.current.mutate({ accountId: 'ACME-000123', status: 'Closed' });

    expect(response).toEqual({ ok: false, errors: undefined, traceId: undefined });
  });
});
