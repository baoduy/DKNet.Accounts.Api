/**
 * DRK-1696 §3 row 6 — reverses a posting with a required reason, through `useReversePosting`
 * (passing `accountId`, or the balance is never invalidated — DRK-1687 finding 10). Wrapped in
 * `ScopeGate scope="postings.reverse"`. Shared by the detail and Records screens (DRK-1713 §3
 * row 12), and drawn in a side panel's footer.
 *
 * DRK-1745 §3 row 8 (Design/ui_kits/records-crud) — `Reverse` opens the destructive "Reverse
 * record" dialog, which collects the reason (required, at most 500 characters, refused on its
 * own control with nothing sent); `Continue` restates the opposing movement in
 * `ConfirmMovement`, and only its `Reverse record` sends. A refusal reopens the reason dialog
 * with the service's words. `Reverse` stays on screen, disabled, on a posting already reversed
 * or on a reversal; the panel's footnote says why.
 */
'use client';

import { useRef, useState, type CSSProperties, type JSX } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Caption, Mono, Note } from '@/components/ui/text';
import { ConfirmMovement } from '@/components/feedback/ConfirmMovement';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { useIdempotencyKey } from '@/components/forms/use-idempotency-key';
import { isUnreachable, NO_ANSWER_ERROR, routeRefusal } from '@/lib/api/refusal';
import { useReversePosting } from '@/lib/query/mutations';

export const MAX_REVERSAL_REASON_LENGTH = 500;

function reasonError(reason: string): LedgerError | null {
  if (reason.trim().length === 0) return { message: 'A reason is required.' };
  if (reason.length > MAX_REVERSAL_REASON_LENGTH) return { message: `The reason may be at most ${MAX_REVERSAL_REASON_LENGTH} characters.` };
  return null;
}

export interface ReversedPosting {
  postingNumber: string;
  accountNumber: string;
}

/** The `Record reversed` acknowledgement. */
export function reversedText(reversed: ReversedPosting): JSX.Element {
  return (
    <>
      An opposing entry was recorded and <Mono>{reversed.postingNumber}</Mono> is marked Reversed. Nothing was erased — <Mono>{reversed.accountNumber}</Mono> now carries both rows.
    </>
  );
}

export interface ReversePostingFormProps {
  accountId: string;
  accountNumber: string;
  accountName?: string;
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
  /** Called once the service recorded the reversal — the screen acknowledges it. */
  onReversed?: (reversed: ReversedPosting) => void;
  style?: CSSProperties;
}

type Step = 'closed' | 'reason' | 'confirm';

export function ReversePostingForm({
  accountId,
  accountNumber,
  accountName,
  postingId,
  postingNumber,
  amount,
  currency,
  decimalPlaces,
  direction,
  reversedByPostingId,
  reversesPostingId,
  granted = true,
  onReversed,
  style,
}: ReversePostingFormProps): JSX.Element {
  const [step, setStep] = useState<Step>('closed');
  const [reason, setReason] = useState('');
  const [localReasonError, setLocalReasonError] = useState<LedgerError | null>(null);
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const reverseButton = useRef<HTMLButtonElement>(null);

  const idempotency = useIdempotencyKey();
  const reverse = useReversePosting();
  const { fieldErrors, alertErrors } = routeRefusal(errors);
  const shownReasonError = localReasonError ?? fieldErrors.reason ?? null;
  const refused = Boolean(reversedByPostingId || reversesPostingId);

  function cancel(): void {
    setStep('closed');
    setLocalReasonError(null);
  }

  function proceed(): void {
    const refusal = reasonError(reason);
    setLocalReasonError(refusal);
    if (!refusal) setStep('confirm');
  }

  async function handleConfirm(): Promise<void> {
    setStep('closed');
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
        onReversed?.({ postingNumber, accountNumber });
      } else {
        // The pass-through's unreachable answer means the service never answered this write.
        setErrors(isUnreachable(result.errors) ? [NO_ANSWER_ERROR] : (result.errors ?? []));
        setStep('reason');
      }
    } catch {
      setErrors([NO_ANSWER_ERROR]);
      setStep('reason');
    }
  }

  // Focus goes back to `Reverse` once the last dialog has closed, never to the page body.
  function returnFocus(event: Event): void {
    event.preventDefault();
    reverseButton.current?.focus();
  }

  return (
    <span style={style} className="contents">
      <ScopeGate scope="postings.reverse" granted={granted}>
        <Button ref={reverseButton} type="button" size="sm" variant="destructive" disabled={reverse.isPending || refused} onClick={() => setStep('reason')}>
          <RotateCcw size={14} aria-hidden="true" />
          Reverse
        </Button>
      </ScopeGate>

      <Dialog
        open={step === 'reason'}
        tone="destructive"
        title="Reverse record"
        onClose={cancel}
        onCloseAutoFocus={(event) => {
          if (step === 'closed') returnFocus(event);
        }}
        footer={
          <>
            <Button type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="ml-auto" onClick={proceed}>
              Continue
            </Button>
          </>
        }
      >
        <div>
          Reversing <Mono>{postingNumber}</Mono> posts an opposing entry against <Mono>{accountNumber}</Mono>. Nothing is erased.
        </div>
        <label className="mt-4 flex flex-col gap-1.5">
          <Caption>
            Reason
            <span aria-hidden="true" className="ml-0.5 text-destructive-solid">
              *
            </span>
          </Caption>
          <Textarea
            rows={3}
            value={reason}
            invalid={shownReasonError !== null}
            placeholder="Why this record is being reversed."
            onChange={(event) => {
              setReason(event.target.value);
              if (localReasonError && reasonError(event.target.value) === null) setLocalReasonError(null);
            }}
          />
        </label>
        <Note className="mt-3">
          Required, at most {MAX_REVERSAL_REASON_LENGTH} characters. Stored as the reversal&apos;s description and shown in the reversal lineage — this is the audit trail for the correction.
        </Note>
        {shownReasonError ? (
          <span role="alert" className="mt-3 block text-caption text-destructive-solid">
            {shownReasonError.message}
          </span>
        ) : null}
        <RefusalAlert errors={alertErrors} className="mt-3" />
      </Dialog>

      <ConfirmMovement
        open={step === 'confirm'}
        direction={direction === 'Credit' ? 'Debit' : 'Credit'}
        amount={amount}
        currency={currency}
        decimalPlaces={decimalPlaces}
        accountNumber={accountNumber}
        accountName={accountName}
        category="Reversal"
        consequence={
          <>
            A new opposing record is posted, effective the day it is recorded, and <Mono>{postingNumber}</Mono> is marked Reversed. Nothing is erased — the account carries both rows.
            Reason: {reason.trim()}
          </>
        }
        onBack={() => setStep('reason')}
        onCloseAutoFocus={(event) => {
          if (step === 'closed') returnFocus(event);
        }}
        onConfirm={handleConfirm}
        confirmLabel="Reverse record"
      />
    </span>
  );
}
