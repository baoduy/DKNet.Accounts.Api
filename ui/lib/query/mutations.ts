/**
 * DRK-1684 §3 row 9 — write hooks. Every write carries the operator's granted permission
 * (`ScopeGate`) and the idempotency key `useIdempotencyKey` minted (§3 "Writes and
 * refusals"); on success it invalidates the affected query keys (row 8) and regenerates the
 * key — never before a success.
 */
'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { sendLedgerWrite } from '@/lib/api/ledger-request';
import type { Currency } from './currencies';
import { toCurrency } from './currencies';
import type { AccountGroup, AccountGroupType } from './groups';
import { accountBalanceKey, accountGroupBalancesKey, accountGroupKey, accountGroupsListKey, currenciesKey, currencyKey, postingsListKey } from './keys';

/** DRK-1760 §3 row 2 — what every write hook returns. */
export interface LedgerMutation<Input, Result> {
  mutate: (input: Input) => Promise<Result>;
  /** True while the write is in flight — the action that sent it is disabled meanwhile (row 10). */
  isPending: boolean;
}

/**
 * Every write hook's one shape. A second `mutate` while the first is still in flight is handed the
 * first one's answer instead of sending again, so a double-click sends one request.
 */
export function useLedgerMutation<Input, Result>(options: { mutationFn: (input: Input) => Promise<Result>; onSuccess?: (result: Result, input: Input) => void }): LedgerMutation<Input, Result> {
  const mutation = useMutation<Result, Error, Input>(options);
  const inFlight = useRef<Promise<Result> | null>(null);
  return {
    mutate: (input) => {
      inFlight.current ??= mutation.mutateAsync(input).finally(() => {
        inFlight.current = null;
      });
      return inFlight.current;
    },
    isPending: mutation.isPending,
  };
}

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

export function useRecordPosting(): LedgerMutation<RecordPostingInput, RecordPostingResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: async (input: RecordPostingInput): Promise<RecordPostingResult> => {
      const result = await sendLedgerWrite('/api/ledger/postings', {
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
      return result.ok ? { ok: true } : { ok: false, errors: result.errors, traceId: result.traceId };
    },
    // TanStack already hands the original variables back as the second argument — no need to
    // round-trip `regenerateIdempotencyKey` through the mutation's own result for this.
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountBalanceKey(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: postingsListKey({}) });
      variables.regenerateIdempotencyKey();
    },
  });
}

export function useReversePosting(): LedgerMutation<ReversePostingInput, ReversePostingResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: async (input: ReversePostingInput): Promise<ReversePostingResult> => {
      const result = await sendLedgerWrite(`/api/ledger/postings/${input.postingId}/reverse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': input.idempotencyKey },
        body: JSON.stringify({ reason: input.reason }),
      });
      return result.ok ? { ok: true } : { ok: false, errors: result.errors, traceId: result.traceId };
    },
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountBalanceKey(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: postingsListKey({}) });
      variables.regenerateIdempotencyKey();
    },
  });
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
  const result = await sendLedgerWrite(url, init);
  if (!result.ok) return result;
  return { ok: true, group: result.status === 204 ? undefined : (result.body as AccountGroup) };
}

async function sendCurrencyRequest(url: string, init: RequestInit): Promise<CurrencyMutationResult> {
  const result = await sendLedgerWrite(url, init);
  if (!result.ok) return result;
  return { ok: true, currency: toCurrency(result.body) };
}

export function useCreateAccountGroup(): LedgerMutation<CreateAccountGroupInput, AccountGroupMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
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
}

export function useUpdateAccountGroup(): LedgerMutation<UpdateAccountGroupInput, AccountGroupMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
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
}

export function useCloseAccountGroup(): LedgerMutation<{ groupId: string }, AccountGroupMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: (input: { groupId: string }) =>
      sendGroupRequest(`/api/ledger/account-groups/${encodeURIComponent(input.groupId)}/close`, { method: 'POST' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountGroupKey(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: accountGroupsListKey({}) });
    },
  });
}

export function useActivateAccountGroup(): LedgerMutation<{ groupId: string }, AccountGroupMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: (input: { groupId: string }) =>
      sendGroupRequest(`/api/ledger/account-groups/${encodeURIComponent(input.groupId)}/activate`, { method: 'POST' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountGroupKey(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: accountGroupsListKey({}) });
    },
  });
}

export function useDeleteAccountGroup(): LedgerMutation<{ groupId: string }, LedgerMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: (input: { groupId: string }) =>
      sendGroupRequest(`/api/ledger/account-groups/${encodeURIComponent(input.groupId)}`, { method: 'DELETE' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountGroupBalancesKey(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: accountGroupsListKey({}) });
    },
  });
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

export function useRegisterCurrency(): LedgerMutation<RegisterCurrencyInput, CurrencyMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
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
}

export function useRenameCurrency(): LedgerMutation<RenameCurrencyInput, CurrencyMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
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
}

export function useActivateCurrency(): LedgerMutation<{ currencyId: string }, CurrencyMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: (input: { currencyId: string }) =>
      sendCurrencyRequest(`/api/ledger/currencies/${encodeURIComponent(input.currencyId)}/activate`, { method: 'POST' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: currencyKey(variables.currencyId) });
      queryClient.invalidateQueries({ queryKey: currenciesKey() });
    },
  });
}

export function useDeactivateCurrency(): LedgerMutation<{ currencyId: string }, CurrencyMutationResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: (input: { currencyId: string }) =>
      sendCurrencyRequest(`/api/ledger/currencies/${encodeURIComponent(input.currencyId)}/deactivate`, { method: 'POST' }),
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: currencyKey(variables.currencyId) });
      queryClient.invalidateQueries({ queryKey: currenciesKey() });
    },
  });
}
