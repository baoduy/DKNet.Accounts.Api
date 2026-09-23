import type { CSSProperties, JSX, ReactNode } from 'react';

export interface LedgerColumn<T = unknown> {
  /** The DTO field name. */
  key: string;
  header: string;
  /** MUST be `false` for `availableBalance` and `openedOn` — both are computed on the entity. */
  sortable?: boolean;
  /** When the query name differs from the body's, e.g. `CurrencyCode` for `currency`. */
  queryAs?: string;
  align?: 'left' | 'right';
  render?: (row: T) => ReactNode;
}

export interface LedgerTableProps<T = unknown> {
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

export function LedgerTable<T = unknown>(_props: LedgerTableProps<T>): JSX.Element {
  throw new Error('Not implemented: LedgerTable');
}
