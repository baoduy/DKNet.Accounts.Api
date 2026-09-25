/**
 * DRK-1696 §3 row 6 — reverses a posting with a required reason, through `useReversePosting`
 * (passing `accountId`, or the balance is never invalidated — DRK-1687 finding 10). Wrapped in
 * `ScopeGate scope="postings.reverse"`. Shared by the detail and Records screens (DRK-1713 §3
 * row 12): the reason is required and at most 500 characters, refused on its own control with
 * nothing sent; `Reverse` stays on screen, disabled with its reason, on a posting already
 * reversed or on a reversal. Mounted only under a query provider.
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmMovement } from '@/components/feedback/ConfirmMovement';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { useIdempotencyKey } from '@/components/forms/use-idempotency-key';
import { isUnreachable, NO_ANSWER_ERROR, routeRefusal } from '@/lib/api/refusal';
import { usePosting } from '@/lib/accounts/query';
import { useReversePosting } from '@/lib/query/mutations';

export const MAX_REVERSAL_REASON_LENGTH = 500;

/** DRK-1713 §5 — said before any action, on the details and in the reversal's confirmation. */
export const NEVER_EDITED_STATEMENT =
  'A posting is never edited or deleted. Reversing records an opposing posting and marks this one reversed. Both stay on the account.';

function reasonError(reason: string): LedgerError | null {
  if (reason.trim().length === 0) return { message: 'A reason is required.' };
  if (reason.length > MAX_REVERSAL_REASON_LENGTH) return { message: `The reason may be at most ${MAX_REVERSAL_REASON_LENGTH} characters.` };
  return null;
}

export interface ReversePostingFormProps {
  accountId: string;
  accountNumber: string;
  postingId: string;
  postingNumber: string;
  amount: string;
  currency: string;
  decimalPlaces?: number;
  direction: 'Credit' | 'Debit';
  /** The posting that reversed this one — the service refuses a second reversal. */
  reversedByPostingId?: string | null;
  /** The posting this one reverses — a reversal is corrected by a new posting, never reversed. */
  reversesPostingId?: string | null;
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
  reversedByPostingId,
  reversesPostingId,
  granted = true,
  style,
}: ReversePostingFormProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState('');
  const [localReasonError, setLocalReasonError] = useState<LedgerError | null>(null);
  const [errors, setErrors] = useState<LedgerError[]>([]);

  const idempotency = useIdempotencyKey();
  const reverse = useReversePosting();
  const linked = usePosting(reversedByPostingId || reversesPostingId).data;
  const { fieldErrors, alertErrors } = routeRefusal(errors);
  const shownReasonError = localReasonError ?? fieldErrors.reason ?? null;

  async function handleConfirm(): Promise<void> {
    const refused = reasonError(reason);
    setLocalReasonError(refused);
    if (refused) return;
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
        // The pass-through's unreachable answer means the service never answered this write.
        setErrors(isUnreachable(result.errors) ? [NO_ANSWER_ERROR] : (result.errors ?? []));
      }
    } catch {
      setErrors([NO_ANSWER_ERROR]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={style} className="flex flex-col gap-2">
      <ScopeGate scope="postings.reverse" granted={granted}>
        <Button type="button" disabled={pending || !!reversedByPostingId || !!reversesPostingId} onClick={() => setOpen(true)}>
          Reverse
        </Button>
      </ScopeGate>

      {reversedByPostingId ? (
        <p>
          <span className="font-mono font-semibold">POSTING_ALREADY_REVERSED</span> Already reversed by {linked?.postingNumber ?? ''}
        </p>
      ) : reversesPostingId ? (
        <p>This posting is a reversal of {linked?.postingNumber ?? ''}; record a new posting to correct it</p>
      ) : null}

      <RefusalAlert errors={alertErrors} />

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
            <p>{NEVER_EDITED_STATEMENT}</p>
            <label className="flex flex-col gap-1">
              Reason
              <textarea
                aria-label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={shownReasonError ? 'true' : undefined}
              />
              {shownReasonError ? <span role="alert">{shownReasonError.message}</span> : null}
            </label>
          </div>
        }
        onBack={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
