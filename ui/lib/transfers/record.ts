/**
 * DRK-2325 §3 row 5 — records one transfer (`POST /v1/transfers`), the idempotency key in the
 * header, both currencies in the body, every amount sent as the text the operator typed. A 201 and a
 * 200 (the transfer already recorded under this key, replayed) are both recorded (R7): the list is
 * read again and the key regenerated — never before.
 */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { sendLedgerWrite } from '@/lib/api/ledger-request';
import { transfersListKey } from '@/lib/query/keys';
import { useLedgerMutation, type LedgerMutation } from '@/lib/query/mutations';
import type { TransferDto } from './query';

export interface RecordTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  sourceCurrency: string;
  destinationCurrency: string;
  /** Sent only when the currencies differ. */
  exchangeRate?: string;
  fee: string;
  /** Sent only when the fee is above 0. */
  feeAccountId?: string;
  idempotencyKey: string;
  regenerateIdempotencyKey: () => void;
}

export type RecordTransferResult = { ok: true; transfer: TransferDto } | { ok: false; errors?: LedgerError[]; traceId?: string };

export function useRecordTransfer(): LedgerMutation<RecordTransferInput, RecordTransferResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: async ({ idempotencyKey, regenerateIdempotencyKey: _regenerate, ...body }: RecordTransferInput): Promise<RecordTransferResult> => {
      const result = await sendLedgerWrite('/api/ledger/transfers', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body),
      });
      return result.ok ? { ok: true, transfer: result.body as TransferDto } : { ok: false, errors: result.errors, traceId: result.traceId };
    },
    onSuccess: (result, variables) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: transfersListKey({}) });
      variables.regenerateIdempotencyKey();
    },
  });
}
