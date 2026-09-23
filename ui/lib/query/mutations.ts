/**
 * DRK-1684 §3 row 9 — write hooks. Every write carries the operator's granted permission
 * (`ScopeGate`) and the idempotency key `useIdempotencyKey` minted (§3 "Writes and
 * refusals"); on success it invalidates the affected query keys (row 8) and regenerates the
 * key — never before a success.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { accountBalanceKey, postingsListKey } from './keys';

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
