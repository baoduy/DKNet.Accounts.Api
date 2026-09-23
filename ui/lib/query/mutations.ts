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
}

export interface RecordPostingResult {
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
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountBalanceKey(result.accountId) });
      queryClient.invalidateQueries({ queryKey: postingsListKey({}) });
    },
  });

  return { mutate: (input) => mutation.mutateAsync(input) };
}
