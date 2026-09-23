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
  decimalPlaces?: number;
  accountNumber?: string;
  accountName?: string;
  effectiveDate?: string;
  category?: string;
  /** Batch mode — every leg is listed, and the dialog states all-or-nothing. */
  legs?: MovementLeg[];
  consequence?: ReactNode;
  onBack?: () => void;
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
  onConfirm,
  confirmLabel = 'Confirm',
}: ConfirmMovementProps): JSX.Element {
  return (
    <Dialog open={open}>
      <DialogContent>
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
          <p>
            This will {direction === 'Debit' ? 'debit' : 'credit'}{' '}
            <Money amount={amount ?? 0} currency={currency} decimalPlaces={decimalPlaces} showCurrency />{' '}
            {direction === 'Debit' ? 'from' : 'to'} <AccountNumber value={accountNumber ?? ''} />
            {accountName ? ` (${accountName})` : ''}
            {effectiveDate ? `, effective ${effectiveDate}` : ''}
            {category ? `, category ${category}` : ''}.
          </p>
        )}

        {consequence ? <p className="text-muted-foreground">{consequence}</p> : null}

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
