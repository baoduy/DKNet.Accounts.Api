/**
 * DRK-1696 §3 row 9 — `LedgerTable` + `ACCOUNT_COLUMNS` (`lib/accounts/filters.ts`). No
 * footer, no total row, no export control: an account list is browsed and opened, never
 * summed or exported. A row opens the account in the side panel; its number links to the
 * account's own page (DRK-1745).
 */
import type { CSSProperties, JSX } from 'react';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { ACCOUNT_COLUMNS } from '@/lib/accounts/filters';

export interface AccountsTableRow {
  /** The account's guid — the row key and the panel's `?open=`; absent for callers that never open a panel. */
  id?: string;
  accountNumber: string;
  groupCode?: string;
  classification?: string;
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
  selectedId?: string | null;
  onSelectRow?: (row: AccountsTableRow) => void;
  emptyMessage?: string;
  loading?: boolean;
  style?: CSSProperties;
}

export function AccountsTable({ rows, orderBy, desc, onSort, selectedId, onSelectRow, emptyMessage = 'No accounts yet.', loading, style }: AccountsTableProps): JSX.Element {
  return (
    <LedgerTable<AccountsTableRow>
      columns={ACCOUNT_COLUMNS}
      rows={rows}
      rowKey={(row) => row.id ?? row.accountNumber}
      selectedId={selectedId}
      onSelectRow={onSelectRow}
      orderBy={orderBy}
      desc={desc}
      onSort={onSort}
      emptyMessage={emptyMessage}
      loading={loading}
      style={style}
    />
  );
}
