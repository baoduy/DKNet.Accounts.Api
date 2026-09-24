/**
 * DRK-1713 §3 row 5 — `LedgerTable` over postings across every account. Only the 3 columns
 * the service orders postings by offer a sort control; no balance column, no footer, no total
 * (R8): a list of postings across accounts and currencies is browsed and opened, never summed.
 */
import { createElement, type CSSProperties, type JSX } from 'react';
import { AccountNumber } from '@/components/ledger/AccountNumber';
import { LedgerTable, type LedgerColumn } from '@/components/ledger/LedgerTable';
import { Money } from '@/components/ledger/Money';
import { StatusBadge } from '@/components/ledger/StatusBadge';

export interface RecordsTableRow {
  id: string;
  postingNumber: string;
  accountNumber: string;
  direction: string;
  category?: string;
  amount: string;
  currency: string;
  /** Absent when the currency list does not name this currency — the amount is then shown as
   * the service sent it, never at a guessed scale. */
  decimalPlaces?: number;
  effectiveDate?: string;
  status: string;
}

/** `queryAs` names the service's own `PostingListOrderFields` value. */
export const RECORD_COLUMNS: LedgerColumn<RecordsTableRow>[] = [
  { key: 'postingNumber', header: 'Posting number', sortable: true, queryAs: 'PostingNumber' },
  {
    key: 'accountNumber',
    header: 'Account',
    render: (row) => createElement(AccountNumber, { value: row.accountNumber, href: `/accounts/${row.accountNumber}` }),
  },
  { key: 'direction', header: 'Direction' },
  { key: 'category', header: 'Category' },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    queryAs: 'Amount',
    align: 'right',
    render: (row) =>
      row.decimalPlaces === undefined ? row.amount : createElement(Money, { amount: row.amount, decimalPlaces: row.decimalPlaces, tone: row.direction === 'Debit' ? 'debit' : 'credit' }),
  },
  { key: 'currency', header: 'Currency' },
  { key: 'effectiveDate', header: 'Effective date', sortable: true, queryAs: 'EffectiveDate' },
  { key: 'status', header: 'Status', render: (row) => createElement(StatusBadge, { status: row.status }) },
];

export interface RecordsTableProps {
  rows: RecordsTableRow[];
  orderBy?: string;
  desc?: boolean;
  onSort?: (field: string) => void;
  selectedId?: string | null;
  onSelectRow?: (row: RecordsTableRow) => void;
  loading?: boolean;
  emptyMessage: string;
  style?: CSSProperties;
}

export function RecordsTable({ rows, orderBy, desc, onSort, selectedId, onSelectRow, loading, emptyMessage, style }: RecordsTableProps): JSX.Element {
  return (
    <LedgerTable<RecordsTableRow>
      columns={RECORD_COLUMNS}
      rows={rows}
      rowKey="id"
      orderBy={orderBy}
      desc={desc}
      onSort={onSort}
      selectedId={selectedId}
      onSelectRow={onSelectRow}
      loading={loading}
      emptyMessage={emptyMessage}
      style={style}
    />
  );
}
