/**
 * DRK-1696 §3 row 6 — reverses a posting from this screen with a required reason, through
 * `useReversePosting` (passing `accountId`, or the balance is never invalidated — DRK-1687
 * finding 10). Wrapped in `ScopeGate scope="postings.reverse"`. Mounted only once a posting
 * is selected (`AccountDetail` gates this behind `accountId` + a selected row), so its
 * mutation hook is never called without a query provider.
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmMovement } from '@/components/feedback/ConfirmMovement';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { useIdempotencyKey } from '@/components/forms/use-idempotency-key';
import { useReversePosting } from '@/lib/query/mutations';

export interface ReversePostingFormProps {
  accountId: string;
  accountNumber: string;
  postingId: string;
  postingNumber: string;
  amount: string;
  currency: string;
  decimalPlaces?: number;
  direction: 'Credit' | 'Debit';
  granted?: boolean;
  style?: CSSProperties;
}

export function ReversePostingForm({
  accountId,
  accountNumber,
  postingId,
  postingNumber,
  amount,
  currency,
  decimalPlaces,
  direction,
  granted = true,
  style,
}: ReversePostingFormProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<LedgerError[]>([]);

  const idempotency = useIdempotencyKey();
  const reverse = useReversePosting();

  async function handleConfirm(): Promise<void> {
    setPending(true);
    try {
      const result = await reverse.mutate({
        postingId,
        accountId,
        reason,
        idempotencyKey: idempotency.value,
        regenerateIdempotencyKey: idempotency.regenerate,
      });
      if (result.ok) {
        setErrors([]);
        setReason('');
        setOpen(false);
      } else {
        setErrors(result.errors ?? []);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={style} className="flex flex-col gap-2">
      <ScopeGate scope="postings.reverse" granted={granted}>
        <Button type="button" disabled={pending} onClick={() => setOpen(true)}>
          Reverse
        </Button>
      </ScopeGate>

      <RefusalAlert errors={errors.filter((error) => !error.field)} />

      <ConfirmMovement
        open={open}
        direction={direction}
        amount={amount}
        currency={currency}
        decimalPlaces={decimalPlaces}
        accountNumber={accountNumber}
        confirmLabel="Confirm"
        consequence={
          <div className="flex flex-col gap-2">
            <p>Reversing posting {postingNumber}.</p>
            <label className="flex flex-col gap-1">
              Reason
              <textarea aria-label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
          </div>
        }
        onBack={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
