import type { JSX, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Money } from '@/components/ledger/Money';
import { AccountNumber } from '@/components/ledger/AccountNumber';

export interface MovementLeg {
  direction: 'Credit' | 'Debit';
  amount: number | string;
  currency: string;
  decimalPlaces?: number;
  accountNumber: string;
}

export interface ConfirmMovementProps {
  open?: boolean;
  direction?: 'Credit' | 'Debit';
  amount?: number | string;
  currency?: string;
  /** A ledger amount's own scale: given, the amount is drawn at it; absent, the amount is restated
   * exactly as typed (a form's input, DRK-1713 §3 row 11). Batch legs carry their own. */
  decimalPlaces?: number;
  accountNumber?: string;
  accountName?: string;
  effectiveDate?: string;
  category?: string;
  /** Batch mode — every leg is listed, and the dialog states all-or-nothing. */
  legs?: MovementLeg[];
  consequence?: ReactNode;
  onBack?: () => void;
  /** Escape or a click outside closes the dialog (DRK-1725 §3 row 7); defaults to `onBack`. */
  onDismiss?: () => void;
  /** Where focus goes once the dialog has closed; call `event.preventDefault()` to place it yourself. */
  onCloseAutoFocus?: (event: Event) => void;
  onConfirm?: () => void;
  confirmLabel?: string;
}

/**
 * The restate-in-words dialog used by record, batch and reverse (Design/components/feedback/ConfirmMovement.jsx).
 * It restates the movement rather than echoing the form: a number read twice in the same layout is a number read once.
 */
export function ConfirmMovement({
  open = true,
  direction,
  amount,
  currency,
  decimalPlaces,
  accountNumber,
  accountName,
  effectiveDate,
  category,
  legs,
  consequence,
  onBack,
  onDismiss = onBack,
  onCloseAutoFocus,
  onConfirm,
  confirmLabel = 'Record posting',
}: ConfirmMovementProps): JSX.Element {
  const batch = legs !== undefined && legs.length > 0;
  return (
    <Dialog
      open={open}
      title={batch ? 'Confirm this batch' : 'Confirm this movement'}
      onClose={() => onDismiss?.()}
      onCloseAutoFocus={onCloseAutoFocus}
      footer={
        <>
          <Button type="button" onClick={onBack}>
            Back
          </Button>
          <Button type="button" variant="primary" className="ml-auto" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {batch ? (
        <>
          <div>All-or-nothing: a refusal on any leg leaves the whole batch unrecorded.</div>
          <ul className="mt-3 flex list-disc flex-col gap-1 pl-4.5">
            {legs.map((leg, index) => (
              <li key={index}>
                {leg.direction}{' '}
                <b className="tabular-nums">
                  <Money amount={leg.amount} currency={leg.currency} decimalPlaces={leg.decimalPlaces} showCurrency />
                </b>{' '}
                {leg.direction === 'Debit' ? 'from' : 'to'}{' '}
                <b className="font-mono">
                  <AccountNumber value={leg.accountNumber} />
                </b>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="m-0">
          {direction}{' '}
          <b className="tabular-nums">
            {/* DRK-1713 §3 row 11 — a typed amount is restated exactly as typed, never through
                `Money`, which would re-pad or regroup it; a ledger amount is drawn at its scale. */}
            {decimalPlaces === undefined ? `${String(amount ?? '')} ${currency ?? ''}` : <Money amount={amount ?? ''} currency={currency} decimalPlaces={decimalPlaces} showCurrency />}
          </b>{' '}
          {direction === 'Debit' ? 'from' : 'to'}{' '}
          <b className="font-mono">
            <AccountNumber value={accountNumber ?? ''} />
          </b>
          {accountName ? <> · {accountName}</> : null}
          {effectiveDate ? (
            <>
              ,<br />
              effective <b>{effectiveDate}</b>
            </>
          ) : null}
          {category ? (
            <>
              , category <b>{category}</b>
            </>
          ) : null}
          .
        </p>
      )}
      {consequence ? <div className="mt-3 text-[length:var(--text-caption-size)] leading-[var(--text-caption-leading)] text-muted-foreground">{consequence}</div> : null}
    </Dialog>
  );
}
