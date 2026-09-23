/**
 * DRK-1684 §3 row 9 — write hooks. Every write carries the operator's granted permission
 * (`ScopeGate`) and the idempotency key `useIdempotencyKey` minted (§3 "Writes and
 * refusals"); on success it invalidates the affected query keys (row 8) and regenerates the
 * key — never before a success.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
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
 * (row 9) on success only. Build stage implements every body; these stubs only pin the
 * signatures `AccountGroupsScreen` / `CurrenciesScreen` (rows 11-12) compile against.
 *
 * R3: a group's `code` and `ownerId`, and a currency's `code` and `decimalPlaces`, are
 * settable only at creation/registration — absent from every input below that acts on an
 * existing record.
 */
export type AccountGroupType = 'Customer' | 'Merchant' | 'Internal' | 'Suspense' | 'Settlement';

export interface LedgerMutationResult {
  ok: boolean;
  errors?: LedgerError[];
  traceId?: string;
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

function notImplemented<TInput>(): { mutate: (input: TInput) => Promise<LedgerMutationResult> } {
  return {
    mutate: (_input: TInput) => {
      throw new Error('Not implemented — DRK-1697 Build stage (row 10).');
    },
  };
}

export function useCreateAccountGroup(): { mutate: (input: CreateAccountGroupInput) => Promise<LedgerMutationResult> } {
  void accountGroupsListKey;
  return notImplemented<CreateAccountGroupInput>();
}

export function useUpdateAccountGroup(): { mutate: (input: UpdateAccountGroupInput) => Promise<LedgerMutationResult> } {
  void accountGroupKey;
  return notImplemented<UpdateAccountGroupInput>();
}

export function useCloseAccountGroup(): { mutate: (input: { groupId: string }) => Promise<LedgerMutationResult> } {
  return notImplemented<{ groupId: string }>();
}

export function useActivateAccountGroup(): { mutate: (input: { groupId: string }) => Promise<LedgerMutationResult> } {
  return notImplemented<{ groupId: string }>();
}

export function useDeleteAccountGroup(): { mutate: (input: { groupId: string }) => Promise<LedgerMutationResult> } {
  void accountGroupBalancesKey;
  return notImplemented<{ groupId: string }>();
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

export function useRegisterCurrency(): { mutate: (input: RegisterCurrencyInput) => Promise<LedgerMutationResult> } {
  void currenciesKey;
  return notImplemented<RegisterCurrencyInput>();
}

export function useRenameCurrency(): { mutate: (input: RenameCurrencyInput) => Promise<LedgerMutationResult> } {
  void currencyKey;
  return notImplemented<RenameCurrencyInput>();
}

export function useActivateCurrency(): { mutate: (input: { currencyId: string }) => Promise<LedgerMutationResult> } {
  return notImplemented<{ currencyId: string }>();
}

export function useDeactivateCurrency(): { mutate: (input: { currencyId: string }) => Promise<LedgerMutationResult> } {
  return notImplemented<{ currencyId: string }>();
}
