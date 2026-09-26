import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountKeyPrefix, accountsListKey } from '@/lib/query/keys';
import { useChangeAccountDetails, useOpenAccount, useSaveAccountEdit, useSetAccountControls } from './mutations';

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

describe('useSaveAccountEdit (DRK-1760 §3 row 2)', () => {
  const FLOOR = { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null };

  function ok(): { ok: boolean; status: number; text: () => Promise<string> } {
    return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'a1' }) };
  }

  it('sends only the PATCH when neither the name nor the notes changed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSaveAccountEdit(), { wrapper: wrapper(new QueryClient()) });

    const errors = await result.current.mutate({ accountId: 'a1', current: { name: 'Acme', notes: '' }, name: 'Acme', notes: '', floor: FLOOR });

    expect(errors).toEqual([]);
    expect(fetchMock.mock.calls.map(([, init]) => (init as RequestInit).method)).toEqual(['PATCH']);
  });

  it('sends the PUT with the new name only, then the PATCH, when the name changed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSaveAccountEdit(), { wrapper: wrapper(new QueryClient()) });

    await result.current.mutate({ accountId: 'a1', current: { name: 'Acme', notes: 'n' }, name: 'Acme treasury', notes: 'n', floor: FLOOR });

    expect(fetchMock.mock.calls.map(([url, init]) => `${(init as RequestInit).method} ${url as string}`)).toEqual(['PUT /api/ledger/accounts/a1', 'PATCH /api/ledger/accounts/a1']);
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ name: 'Acme treasury' });
  });

  it('resends every metadata key with the new notes when only the notes changed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSaveAccountEdit(), { wrapper: wrapper(new QueryClient()) });

    await result.current.mutate({ accountId: 'a1', current: { name: 'Acme', notes: 'old', metadata: { desk: 'fx', notes: 'old' } }, name: 'Acme', notes: 'new', floor: FLOOR });

    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ metadata: { desk: 'fx', notes: 'new' } });
  });

  it('resolves to every refusal both calls returned', async () => {
    const refusal = (message: string) => ({ ok: false, status: 422, text: async () => JSON.stringify({ errors: [{ message }] }) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(refusal('Name is taken.')).mockResolvedValueOnce(refusal('Floor refused.')));
    const { result } = renderHook(() => useSaveAccountEdit(), { wrapper: wrapper(new QueryClient()) });

    const errors = await result.current.mutate({ accountId: 'a1', current: { name: 'Acme', notes: '' }, name: 'Acme 2', notes: '', floor: FLOOR });

    expect(errors).toEqual([{ message: 'Name is taken.' }, { message: 'Floor refused.' }]);
  });

  it('is pending from the first request until the last one has answered', async () => {
    let answerPatch!: (response: unknown) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok())
      .mockReturnValueOnce(new Promise((resolve) => (answerPatch = resolve)));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useSaveAccountEdit(), { wrapper: wrapper(new QueryClient()) });
    expect(result.current.isPending).toBe(false);

    const saved = result.current.mutate({ accountId: 'a1', current: { name: 'Acme', notes: '' }, name: 'Acme 2', notes: '', floor: FLOOR });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current.isPending).toBe(true);

    answerPatch(ok());
    await saved;
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});

describe('useSaveAccountEdit — a refusal with no errors', () => {
  it('resolves to no errors rather than throwing when a refusal carries none', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => '' }));
    const { result } = renderHook(() => useSaveAccountEdit(), { wrapper: wrapper(new QueryClient()) });

    const errors = await result.current.mutate({
      accountId: 'a1',
      current: { name: 'Acme', notes: '' },
      name: 'Acme 2',
      notes: '',
      floor: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null },
    });

    expect(errors).toEqual([]);
  });
});
