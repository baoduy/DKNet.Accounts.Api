import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountBalanceKey, accountGroupBalancesKey, accountGroupKey, accountGroupsListKey, currenciesKey, currencyKey, postingsListKey } from './keys';
import {
  useActivateAccountGroup,
  useActivateCurrency,
  useCloseAccountGroup,
  useCreateAccountGroup,
  useDeactivateCurrency,
  useDeleteAccountGroup,
  useRecordPosting,
  useRegisterCurrency,
  useRenameCurrency,
  useReversePosting,
  useUpdateAccountGroup,
} from './mutations';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

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

const GROUP_DTO = { id: 'g1', code: 'TRSY', name: 'Treasury', type: 'Customer', status: 'Active', ownerId: 'default-owner' };

describe('useCreateAccountGroup', () => {
  it('posts to /api/ledger/account-groups and invalidates the list on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, GROUP_DTO));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ code: 'TRSY', name: 'Treasury', type: 'Customer', ownerId: 'default-owner' });

    expect(response).toEqual({ ok: true, group: GROUP_DTO });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/account-groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'TRSY', name: 'Treasury', description: undefined, type: 'Customer', ownerId: 'default-owner', metadata: undefined }),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupsListKey({}) }));
  });

  it('routes a duplicate-code refusal back unchanged, invalidating nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { errors: [{ message: 'Code TRSY is already used.', code: 'DUPLICATE_GROUP_CODE', field: 'code' }], traceId: 't-9' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ code: 'TRSY', name: 'Treasury Two', type: 'Customer', ownerId: 'default-owner' });

    expect(response).toEqual({ ok: false, errors: [{ message: 'Code TRSY is already used.', code: 'DUPLICATE_GROUP_CODE', field: 'code' }], traceId: 't-9' });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useUpdateAccountGroup', () => {
  it('PUTs only the changed fields and invalidates the group and its list on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ...GROUP_DTO, name: 'Treasury (renamed)' }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ groupId: 'g1', name: 'Treasury (renamed)' });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/account-groups/g1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Treasury (renamed)' }),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupKey('g1') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupsListKey({}) });
  });

  it('surfaces the no-fields-changed refusal with no invented code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { errors: [{ message: 'At least one field must be supplied.' }], traceId: 't-3' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ groupId: 'g1' });

    expect(response).toEqual({ ok: false, errors: [{ message: 'At least one field must be supplied.' }], traceId: 't-3' });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useCloseAccountGroup / useActivateAccountGroup / useDeleteAccountGroup', () => {
  it('closes a group with no request body and invalidates it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ...GROUP_DTO, status: 'Closed' }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCloseAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ groupId: 'g1' });

    expect(response).toEqual({ ok: true, group: { ...GROUP_DTO, status: 'Closed' } });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/account-groups/g1/close', { method: 'POST' });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupKey('g1') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupsListKey({}) });
  });

  it('refuses to close a group that holds a balance, unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { errors: [{ message: 'Group TRSY holds an account with a balance.', code: 'GROUP_HOLDS_BALANCE' }], traceId: 't-4' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCloseAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ groupId: 'g1' });

    expect(response.ok).toBe(false);
    expect(response.errors).toEqual([{ message: 'Group TRSY holds an account with a balance.', code: 'GROUP_HOLDS_BALANCE' }]);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('reactivates a closed group and invalidates it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { ...GROUP_DTO, status: 'Active' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useActivateAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ groupId: 'g1' });

    expect(response).toEqual({ ok: true, group: { ...GROUP_DTO, status: 'Active' } });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupKey('g1') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupsListKey({}) });
  });

  it('refuses to reactivate a group and invalidates nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { errors: [{ message: 'Group TRSY cannot be reactivated.', code: 'GROUP_REACTIVATION_REFUSED' }], traceId: 't-10' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useActivateAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ groupId: 'g1' });

    expect(response.ok).toBe(false);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('deletes a group with no body on a 204 and invalidates its balances and the list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ groupId: 'g1' });

    expect(response).toEqual({ ok: true, group: undefined });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/account-groups/g1', { method: 'DELETE' });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupBalancesKey('g1') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: accountGroupsListKey({}) });
  });

  it('refuses to delete a group that still holds an account, unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { errors: [{ message: 'Group TRSY still holds an account.', code: 'GROUP_NOT_EMPTY' }], traceId: 't-5' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteAccountGroup(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ groupId: 'g1' });

    expect(response.ok).toBe(false);
    expect(response.errors).toEqual([{ message: 'Group TRSY still holds an account.', code: 'GROUP_NOT_EMPTY' }]);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

const CURRENCY_DTO = { id: 'c1', code: 'VND', name: 'Vietnamese Dong', decimalPlaces: 0, isActive: true };

describe('useRegisterCurrency', () => {
  it('posts the code, name and decimal places, and invalidates the currency list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(CURRENCY_DTO), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRegisterCurrency(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ code: 'VND', name: 'Vietnamese Dong', decimalPlaces: 0 });

    expect(response).toEqual({ ok: true, currency: CURRENCY_DTO });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/currencies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'VND', name: 'Vietnamese Dong', decimalPlaces: 0 }),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: currenciesKey() }));
  });

  it('routes a duplicate-code refusal back unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { errors: [{ message: 'Code SGD is already registered.', code: 'DUPLICATE_CURRENCY_CODE', field: 'code' }], traceId: 't-6' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRegisterCurrency(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ code: 'SGD', name: 'Singapore Dollar Two', decimalPlaces: 2 });

    expect(response).toEqual({ ok: false, errors: [{ message: 'Code SGD is already registered.', code: 'DUPLICATE_CURRENCY_CODE', field: 'code' }], traceId: 't-6' });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useRenameCurrency / useActivateCurrency / useDeactivateCurrency', () => {
  it('renames a currency and invalidates it and the list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...CURRENCY_DTO, name: 'Vietnamese Dong (VN)' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRenameCurrency(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ currencyId: 'c1', name: 'Vietnamese Dong (VN)' });

    expect(response).toEqual({ ok: true, currency: { ...CURRENCY_DTO, name: 'Vietnamese Dong (VN)' } });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/currencies/c1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Vietnamese Dong (VN)' }),
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: currencyKey('c1') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: currenciesKey() });
  });

  it('refuses to rename a currency and invalidates nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { errors: [{ message: 'Name must not be blank.' }], traceId: 't-8' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRenameCurrency(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ currencyId: 'c1', name: '' });

    expect(response.ok).toBe(false);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('activates a currency with no request body and invalidates it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...CURRENCY_DTO, isActive: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useActivateCurrency(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ currencyId: 'c1' });

    expect(response).toEqual({ ok: true, currency: { ...CURRENCY_DTO, isActive: true } });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/currencies/c1/activate', { method: 'POST' });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: currencyKey('c1') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: currenciesKey() });
  });

  it('refuses to activate a currency and invalidates nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { errors: [{ message: 'Currency VND is already active.' }], traceId: 't-9' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useActivateCurrency(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ currencyId: 'c1' });

    expect(response.ok).toBe(false);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('deactivates a currency with no request body and invalidates it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...CURRENCY_DTO, isActive: false }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeactivateCurrency(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ currencyId: 'c1' });

    expect(response).toEqual({ ok: true, currency: { ...CURRENCY_DTO, isActive: false } });
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/currencies/c1/deactivate', { method: 'POST' });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: currencyKey('c1') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: currenciesKey() });
  });

  it('refuses to deactivate a currency that still holds a balance, unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { errors: [{ message: 'An account in USD still holds a balance.', code: 'CURRENCY_HOLDS_BALANCE' }], traceId: 't-7' })));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeactivateCurrency(), { wrapper: wrapper(queryClient) });

    const response = await result.current.mutate({ currencyId: 'c1' });

    expect(response.ok).toBe(false);
    expect(response.errors).toEqual([{ message: 'An account in USD still holds a balance.', code: 'CURRENCY_HOLDS_BALANCE' }]);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
