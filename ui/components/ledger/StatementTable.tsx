import type { CSSProperties, JSX, ReactNode } from 'react';

export interface StatementRowShape {
  id?: string;
  effectiveDate: string;
  recordedAt: string;
  postingNumber: string;
  description: ReactNode;
  category?: string;
  /** Already signed. Credits positive, debits negative. */
  signedAmount: number | string;
  balanceAfter: number | string;
  streamPosition: number;
  status?: 'Posted' | 'Reversed';
}

export interface StatementTableProps {
  rows: StatementRowShape[];
  /** From `Currency.decimalPlaces` for the account's currency. */
  decimalPlaces?: number;
  selectedId?: string | null;
  onSelectRow?: (row: StatementRowShape) => void;
  postingHref?: (row: StatementRowShape) => string;
  emptyMessage?: ReactNode;
  style?: CSSProperties;
}

export function StatementTable(_props: StatementTableProps): JSX.Element {
  throw new Error('Not implemented: StatementTable');
}
