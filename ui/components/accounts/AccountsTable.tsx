/**
 * DRK-1696 §3 row 9 — `LedgerTable` + `ACCOUNT_COLUMNS` (`lib/accounts/filters.ts`). No
 * footer, no total row, no export control: an account list is browsed and opened, never
 * summed or exported.
 */
import type { CSSProperties, JSX } from 'react';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { ACCOUNT_COLUMNS } from '@/lib/accounts/filters';

export interface AccountsTableRow {
  accountNumber: string;
  name: string;
  currency: string;
  /** Absent until the currency's scale is known — the amount cells stay empty until then. */
  decimalPlaces?: number;
  balance: string;
  availableBalance: string;
  openedOn: string;
  status: string;
}

export interface AccountsTableProps {
  rows: AccountsTableRow[];
  orderBy?: string;
  desc?: boolean;
  onSort?: (field: string) => void;
  emptyMessage?: string;
  style?: CSSProperties;
}

export function AccountsTable({ rows, orderBy, desc, onSort, emptyMessage = 'No accounts found.', style }: AccountsTableProps): JSX.Element {
  return (
    <LedgerTable<AccountsTableRow>
      columns={ACCOUNT_COLUMNS}
      rows={rows}
      rowKey="accountNumber"
      orderBy={orderBy}
      desc={desc}
      onSort={onSort}
      emptyMessage={emptyMessage}
      style={style}
    />
  );
}
