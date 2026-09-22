import type { CSSProperties, ReactNode } from 'react';

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

/**
 * The statement. **Column sorting is off on this table entirely** and that is
 * deliberate — a reader who sorts a ledger by amount has destroyed the only thing
 * `balanceAfter` means. Rows are in stream order and the table says so.
 *
 * Paging here is `pageIndex`/`pageSize` (default 20), not the `pageNumber` every
 * list route uses. Sharing one component with `LedgerTable` would mean a `variant`
 * prop that changes almost everything.
 */
export interface StatementTableProps {
  rows: StatementRowShape[];
  /** From `Currency.decimalPlaces` for the account's currency. */
  decimalPlaces?: number;
  selectedId?: string | null;
  onSelectRow?: (row: StatementRowShape) => void;
  postingHref?: (row: StatementRowShape) => string;
  /**
   * Three different empty states mean three different things: no postings at all,
   * none in the chosen range, or paged past the end. Pass the right one.
   */
  emptyMessage?: ReactNode;
  style?: CSSProperties;
}
export declare function StatementTable(props: StatementTableProps): JSX.Element;
