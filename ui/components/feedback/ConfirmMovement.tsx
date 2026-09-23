import type { JSX, ReactNode } from 'react';

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

export function ConfirmMovement(_props: ConfirmMovementProps): JSX.Element {
  throw new Error('Not implemented: ConfirmMovement');
}
