/**
 * DRK-1713 §3 row 5 — `LedgerTable` over postings, in the kit's columns (DRK-1745 §3 row 5,
 * Design/ui_kits/records-crud). Only the 3 columns the service orders postings by offer a sort
 * control; no balance column, no footer, no total (R8): a list of postings across accounts and
 * currencies is browsed and opened, never summed. The account detail screen drops the Account
 * column and shows Description in its place. The kit's `Recorded by` column is not drawn: the
 * service's posting carries no such field.
 */
import { createElement, type CSSProperties, type JSX } from 'react';
import { AccountNumber } from '@/components/ledger/AccountNumber';
import { Currency } from '@/components/ledger/Currency';
import { LedgerTable, type LedgerColumn } from '@/components/ledger/LedgerTable';
import { Money } from '@/components/ledger/Money';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { Chip } from '@/components/ui/chip';
import { Caption, Mono } from '@/components/ui/text';

export interface RecordsTableRow {
  id: string;
  postingNumber: string;
  accountNumber?: string;
  direction: string;
  category?: string;
  description?: string;
  amount: string;
  currency: string;
  /** Absent when the currency list does not name this currency — the amount is then shown as
   * the service sent it, never at a guessed scale. */
  decimalPlaces?: number;
  effectiveDate?: string;
  status: string;
}

// Fixed English month names: `Intl`'s `en-GB` short month for September is `Sept` in current ICU data.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-09-01` → `1 Sep 2026`; anything else is returned as given. */
export function formatDate(date: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '');
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : (date ?? '');
}

/** The direction as the kit draws it: a credit- or debit-toned badge. */
export function DirectionBadge({ direction }: { direction: string }): JSX.Element {
  return createElement(StatusBadge, { status: direction, tone: direction === 'Debit' ? 'debit' : 'credit' });
}

/** The signed amount at the currency's own scale, struck through once reversed. */
export function SignedAmount({ row, showCurrency = false }: { row: Pick<RecordsTableRow, 'amount' | 'currency' | 'decimalPlaces' | 'direction' | 'status'>; showCurrency?: boolean }): JSX.Element {
  if (row.decimalPlaces === undefined) return createElement('span', null, showCurrency ? `${row.amount} ${row.currency}` : row.amount);
  return createElement(Money, {
    amount: row.direction === 'Debit' ? `-${row.amount}` : row.amount,
    currency: row.currency,
    decimalPlaces: row.decimalPlaces,
    signed: true,
    showCurrency,
    struck: row.status === 'Reversed',
  });
}

/** `queryAs` names the service's own `PostingListOrderFields` value. */
export function recordColumns(scope: 'records' | 'account'): LedgerColumn<RecordsTableRow>[] {
  return [
    {
      key: 'postingNumber',
      header: 'Record no.',
      sortable: true,
      queryAs: 'PostingNumber',
      render: (row) => createElement(Mono, { className: 'font-semibold' }, row.postingNumber),
    },
    scope === 'records'
      ? {
          key: 'accountNumber',
          header: 'Account',
          render: (row) => createElement(AccountNumber, { value: row.accountNumber ?? '', href: `/accounts/${row.accountNumber}` }),
        }
      : {
          key: 'description',
          header: 'Description',
          render: (row) => (row.description ? row.description : createElement(Caption, null, 'Not set.')),
        },
    { key: 'direction', header: 'Direction', render: (row) => createElement(DirectionBadge, { direction: row.direction }) },
    { key: 'category', header: 'Category', render: (row) => (row.category ? createElement(Chip, null, row.category) : null) },
    { key: 'amount', header: 'Amount', sortable: true, queryAs: 'Amount', align: 'right', render: (row) => createElement(SignedAmount, { row }) },
    { key: 'currency', header: 'Currency', render: (row) => createElement(Currency, { code: row.currency }) },
    { key: 'effectiveDate', header: 'Effective', sortable: true, queryAs: 'EffectiveDate', align: 'right', render: (row) => formatDate(row.effectiveDate) },
    { key: 'status', header: 'Status', render: (row) => createElement(StatusBadge, { status: row.status }) },
  ];
}

export const RECORD_COLUMNS = recordColumns('records');

export interface RecordsTableProps {
  rows: RecordsTableRow[];
  scope?: 'records' | 'account';
  orderBy?: string;
  desc?: boolean;
  onSort?: (field: string) => void;
  selectedId?: string | null;
  onSelectRow?: (row: RecordsTableRow) => void;
  loading?: boolean;
  placeholderRows?: number;
  emptyMessage: string;
  style?: CSSProperties;
}

export function RecordsTable({ rows, scope = 'records', orderBy, desc, onSort, selectedId, onSelectRow, loading, placeholderRows, emptyMessage, style }: RecordsTableProps): JSX.Element {
  return (
    <LedgerTable<RecordsTableRow>
      columns={scope === 'records' ? RECORD_COLUMNS : recordColumns('account')}
      rows={rows}
      rowKey="id"
      orderBy={orderBy}
      desc={desc}
      onSort={onSort}
      selectedId={selectedId}
      onSelectRow={onSelectRow}
      loading={loading}
      placeholderRows={placeholderRows}
      emptyMessage={emptyMessage}
      style={style}
    />
  );
}
