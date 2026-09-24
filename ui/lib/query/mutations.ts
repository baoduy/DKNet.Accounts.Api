/**
 * DRK-1684 §3 row 9 — write hooks. Every write carries the operator's granted permission
 * (`ScopeGate`) and the idempotency key `useIdempotencyKey` minted (§3 "Writes and
 * refusals"); on success it invalidates the affected query keys (row 8) and regenerates the
 * key — never before a success.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { readLedgerJson } from '@/lib/api/money-json';
import type { Currency } from './currencies';
import { toCurrency } from './currencies';
import type { AccountGroup, AccountGroupType } from './groups';
import { accountBalanceKey, accountGroupBalancesKey, accountGroupKey, accountGroupsListKey, currenciesKey, currencyKey, postingsListKey } from './keys';

export interface RecordPostingInput {
  accountId: string;
  direction: 'Debit' | 'Credit';
  amount: string;
  currency: string;
  category: string;
  description?: string;
  effectiveDate?: string;
  idempotencyKey: string;
  /** Called once the service actually recorded the posting — never before. The hook does
   * not own the key (`useIdempotencyKey` does), so the caller hands in how to mint a new one. */
  regenerateIdempotencyKey: () => void;
}

export interface RecordPostingResult {
  ok: boolean;
  errors?: LedgerError[];
  traceId?: string;
}

export interface ReversePostingInput {
  postingId: string;
  /** DRK-1687 finding 10: without this, a reversal structurally cannot invalidate the
   * balance it just changed. */
  accountId: string;
  reason: string;
  idempotencyKey: string;
  regenerateIdempotencyKey: () => void;
}

export interface ReversePostingResult {
  ok: boolean;
  errors?: LedgerError[];
  traceId?: string;
}

export function useRecordPosting(): { mutate: (input: RecordPostingInput) => Promise<RecordPostingResult> } {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: RecordPostingInput): Promise<RecordPostingResult & { accountId: string }> => {
      const response = await fetch('/api/ledger/postings', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': input.idempotencyKey },
        body: JSON.stringify({
          accountId: input.accountId,
          direction: input.direction,
          amount: input.amount,
          currency: input.currency,
          category: input.category,
          description: input.description,
          effectiveDate: input.effectiveDate,
        }),
      });

      if (response.ok) {
        return { ok: true, accountId: input.accountId };
      }

      const body = (await response.json()) as { errors?: LedgerError[]; traceId?: string };
      return { ok: false, errors: body.errors, traceId: body.traceId, accountId: input.accountId };
    },
    // TanStack already hands the original variables back as the second argument — no need to
    // round-trip `regenerateIdempotencyKey` through the mutation's own result for this.
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountBalanceKey(result.accountId) });
      queryClient.invalidateQueries({ queryKey: postingsListKey({}) });
      variables.regenerateIdempotencyKey();
    },
  });

  return { mutate: (input) => mutation.mutateAsync(input) };
}

export function useReversePosting(): { mutate: (input: ReversePostingInput) => Promise<ReversePostingResult> } {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: ReversePostingInput): Promise<ReversePostingResult> => {
      const response = await fetch(`/api/ledger/postings/${input.postingId}/reverse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': input.idempotencyKey },
        body: JSON.stringify({ reason: input.reason }),
      });

      if (response.ok) {
        return { ok: true };
      }

      const body = (await response.json()) as { errors?: LedgerError[]; traceId?: string };
      return { ok: false, errors: body.errors, traceId: body.traceId };
    },
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountBalanceKey(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: postingsListKey({}) });
      variables.regenerateIdempotencyKey();
    },
  });

  return { mutate: (input) => mutation.mutateAsync(input) };
}

/**
 * DRK-1697 §3 row 10 — write hooks for account groups and currencies, shaped like
 * `useRecordPosting` above: `{ ok, errors, traceId }`, invalidating the affected query keys
 * (row 9) on success only.
 *
 * R3: a group's `code` and `ownerId`, and a currency's `code` and `decimalPlaces`, are
 * settable only at creation/registration — absent from every input below that acts on an
 * existing record.
 */
export interface LedgerMutationResult {
  ok: boolean;
  errors?: LedgerError[];
  traceId?: string;
}

export interface AccountGroupMutationResult extends LedgerMutationResult {
  group?: AccountGroup;
}

export interface CurrencyMutationResult extends LedgerMutationResult {
  currency?: Currency;
}

export interface CreateAccountGroupInput {
  code: string;
  name: string;
  description?: string;
  type: AccountGroupType;
  ownerId: string;
  metadata?: Record<string, string>;
}

export interface UpdateAccountGroupInput {
  groupId: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
}

async function sendGroupRequest(url: string, init: RequestInit): Promise<AccountGroupMutationResult> {
  const response = await fetch(url, init);
  const body = await readLedgerJson(response);
  if (!response.ok) {
    const refusal = body as { errors?: LedgerError[]; traceId?: string };
    return { ok: false, errors: refusal.errors, traceId: refusal.traceId };
  }
  return { ok: true, group: response.status === 204 ? undefined : (body as AccountGroup) };
}

async function sendCurrencyRequest(url: string, init: RequestInit): Promise<CurrencyMutationResult> {
  const response = await fetch(url, init);
  const body = await readLedgerJson(response);
  if (!response.ok) {
    const refusal = body as { errors?: LedgerError[]; traceId?: string };
    return { ok: false, errors: refusal.errors, traceId: refusal.traceId };
  }
  return { ok: true, currency: toCurrency(body) };
}

export function useCreateAccountGroup(): { mutate: (input: CreateAccountGroupInput) => Promise<AccountGroupMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: CreateAccountGroupInput) =>
      sendGroupRequest('/api/ledger/account-groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: input.code,
          name: input.name,
          description: input.description,
          type: input.type,
          ownerId: input.ownerId,
          metadata: input.metadata,
        }),
      }),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountGroupsListKey({}) });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export function useUpdateAccountGroup(): { mutate: (input: UpdateAccountGroupInput) => Promise<AccountGroupMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: UpdateAccountGroupInput) =>
      sendGroupRequest(`/api/ledger/account-groups/${encodeURIComponent(input.groupId)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: input.name, description: input.description, metadata: input.metadata }),
      }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountGroupKey(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: accountGroupsListKey({}) });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export function useCloseAccountGroup(): { mutate: (input: { groupId: string }) => Promise<AccountGroupMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { groupId: string }) =>
      sendGroupRequest(`/api/ledger/account-groups/${encodeURIComponent(input.groupId)}/close`, { method: 'POST' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountGroupKey(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: accountGroupsListKey({}) });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export function useActivateAccountGroup(): { mutate: (input: { groupId: string }) => Promise<AccountGroupMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { groupId: string }) =>
      sendGroupRequest(`/api/ledger/account-groups/${encodeURIComponent(input.groupId)}/activate`, { method: 'POST' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountGroupKey(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: accountGroupsListKey({}) });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export function useDeleteAccountGroup(): { mutate: (input: { groupId: string }) => Promise<LedgerMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { groupId: string }) =>
      sendGroupRequest(`/api/ledger/account-groups/${encodeURIComponent(input.groupId)}`, { method: 'DELETE' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountGroupBalancesKey(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: accountGroupsListKey({}) });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export interface RegisterCurrencyInput {
  code: string;
  name: string;
  decimalPlaces: number;
}

export interface RenameCurrencyInput {
  currencyId: string;
  name: string;
}

export function useRegisterCurrency(): { mutate: (input: RegisterCurrencyInput) => Promise<CurrencyMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: RegisterCurrencyInput) =>
      sendCurrencyRequest('/api/ledger/currencies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: input.code, name: input.name, decimalPlaces: input.decimalPlaces }),
      }),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: currenciesKey() });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export function useRenameCurrency(): { mutate: (input: RenameCurrencyInput) => Promise<CurrencyMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: RenameCurrencyInput) =>
      sendCurrencyRequest(`/api/ledger/currencies/${encodeURIComponent(input.currencyId)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: input.name }),
      }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: currencyKey(variables.currencyId) });
      queryClient.invalidateQueries({ queryKey: currenciesKey() });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export function useActivateCurrency(): { mutate: (input: { currencyId: string }) => Promise<CurrencyMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { currencyId: string }) =>
      sendCurrencyRequest(`/api/ledger/currencies/${encodeURIComponent(input.currencyId)}/activate`, { method: 'POST' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: currencyKey(variables.currencyId) });
      queryClient.invalidateQueries({ queryKey: currenciesKey() });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export function useDeactivateCurrency(): { mutate: (input: { currencyId: string }) => Promise<CurrencyMutationResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { currencyId: string }) =>
      sendCurrencyRequest(`/api/ledger/currencies/${encodeURIComponent(input.currencyId)}/deactivate`, { method: 'POST' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: currencyKey(variables.currencyId) });
      queryClient.invalidateQueries({ queryKey: currenciesKey() });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}
