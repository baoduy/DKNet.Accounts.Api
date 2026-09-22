import type { ReactNode } from 'react';

export interface MovementLeg {
  direction: 'Credit' | 'Debit';
  amount: number | string;
  currency: string;
  decimalPlaces?: number;
  accountNumber: string;
}

/**
 * The confirm step for record, batch and reverse. It restates the movement **in words**
 * rather than echoing the form — a number read twice in the same layout is a number
 * read once.
 *
 * For reverse, set `consequence` to say what reversal actually is: a new opposing
 * posting is recorded and the original is marked Reversed. Nothing is erased. A user
 * who believes they are deleting a row will use it differently from one who knows they
 * are appending a correction.
 */
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
export declare function ConfirmMovement(props: ConfirmMovementProps): JSX.Element;
