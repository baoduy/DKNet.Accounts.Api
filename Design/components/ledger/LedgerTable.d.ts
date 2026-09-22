import type { CSSProperties, ReactNode } from 'react';

export interface LedgerColumn<T = any> {
  /** The DTO field name. */
  key: string;
  header: string;
  /**
   * MUST be `false` for `availableBalance` and `openedOn` — both are computed on the
   * entity, so `filter` or `orderBy` on either is a 400. A sort control on those columns
   * hands the user a button whose only effect is an error.
   */
  sortable?: boolean;
  /** When the query name differs from the body's, e.g. `CurrencyCode` for `currency`. */
  queryAs?: string;
  align?: 'left' | 'right';
  render?: (row: T) => ReactNode;
}

/**
 * One table for groups, accounts and currencies. Rows are data: no action column,
 * no per-row buttons. Clicking a row opens the detail panel; clicking a link inside
 * a row navigates instead.
 *
 * Paging for this table is `pageNumber`/`pageSize` (1-based, default 1000) — the
 * statement uses a different contract and a different component.
 */
export interface LedgerTableProps<T = any> {
  columns: LedgerColumn<T>[];
  rows: T[];
  rowKey?: string | ((row: T) => string);
  selectedId?: string | number | null;
  onSelectRow?: (row: T) => void;
  orderBy?: string;
  desc?: boolean;
  onSort?: (field: string) => void;
  emptyMessage?: ReactNode;
  style?: CSSProperties;
}
export declare function LedgerTable<T = any>(props: LedgerTableProps<T>): JSX.Element;
