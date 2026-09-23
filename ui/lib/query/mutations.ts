/**
 * DRK-1684 §3 row 9 — write hooks. Every write carries the operator's granted permission
 * (`ScopeGate`) and the idempotency key `useIdempotencyKey` minted (§3 "Writes and
 * refusals"); on success it invalidates the affected query keys (row 8) and regenerates the
 * key — never before a success.
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build turns
 * `31-a-new-key-is-used-only-after-a-posting-is-recorded.spec.ts` and
 * `32-a-balance-is-never-shown-from-a-copy-older-than-the-last-write.spec.ts` green by
 * replacing this stub.
 */
import type { LedgerError } from '@/components/feedback/RefusalAlert';

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
  throw new Error('Not implemented: DRK-1684 §3 row 9 — record-posting write hook');
}
