import type { JSX, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
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
  confirmLabel = 'Confirm',
}: ConfirmMovementProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onDismiss?.())}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <DialogTitle>Confirm this movement</DialogTitle>

        {legs && legs.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p>All legs are recorded together, or none are — this is all-or-nothing.</p>
            <ul className="flex flex-col gap-1">
              {legs.map((leg, index) => (
                <li key={index} className="flex items-center justify-between gap-4">
                  <span>
                    {leg.direction} <AccountNumber value={leg.accountNumber} />
                  </span>
                  <Money amount={leg.amount} currency={leg.currency} decimalPlaces={leg.decimalPlaces} showCurrency align="right" />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {/* DRK-1713 §3 row 11 — a typed amount is restated exactly as typed, never through
                `Money`, which would re-pad or regroup it; a ledger amount is drawn at its scale. */}
            <p>
              {direction}{' '}
              {decimalPlaces === undefined ? `${String(amount ?? '')} ${currency ?? ''}` : <Money amount={amount ?? ''} currency={currency} decimalPlaces={decimalPlaces} showCurrency />}{' '}
              {direction === 'Debit' ? 'from' : 'to'} <AccountNumber value={accountNumber ?? ''} />
            </p>
            {accountName || effectiveDate || category ? (
              <p className="text-muted-foreground">
                {[accountName, effectiveDate ? `effective ${effectiveDate}` : '', category ? `category ${category}` : ''].filter(Boolean).join(', ')}
              </p>
            ) : null}
          </>
        )}

        {consequence ? <div className="text-muted-foreground">{consequence}</div> : null}

        <DialogFooter>
          <Button variant="default" onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
