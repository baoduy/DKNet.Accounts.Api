/**
 * DRK-2325 §3 row 6 — `LedgerTable` over one account's transfers: recorded time, source,
 * destination, amount, converted amount, rate and fee. Only the 4 columns the service orders
 * transfers by offer a sort (R4). Every amount is drawn from the service's exact text at its own
 * currency's places (R5); accounts show as numbers, never as ids, and never as links, so a click
 * anywhere on the row opens the transfer.
 */
import { createElement, type JSX } from 'react';
import { LedgerTable, type LedgerColumn } from '@/components/ledger/LedgerTable';
import { formatAmount } from '@/components/ledger/Money';
import { Mono } from '@/components/ui/text';
import type { TransferRowDto } from '@/lib/transfers/query';

/** A transfer as the table and the detail panel draw it — every value already text. */
export interface TransferView {
  id: string;
  recordedAt: string;
  source: string;
  destination: string;
  feeAccount?: string;
  amount: string;
  converted: string;
  rate: string;
  fee: string;
}

/** `amount` at `places`, with its currency; the exact text as sent when the currency's places are unknown. */
export function amountText(amount: string, currency: string, places: number | undefined): string {
  return `${places === undefined ? amount : formatAmount(amount, places)} ${currency}`;
}

/** `2026-10-19T09:30:00+00:00` → `2026-10-19 09:30`, in UTC; anything unreadable as sent. */
export function recordedAtText(recordedAt: string): string {
  const time = new Date(recordedAt);
  return Number.isNaN(time.getTime()) ? recordedAt : time.toISOString().slice(0, 16).replace('T', ' ');
}

export function toTransferView(transfer: TransferRowDto, accountNumberOf: (id: string) => string, placesOf: (code: string) => number | undefined): TransferView {
  return {
    id: transfer.id,
    recordedAt: recordedAtText(transfer.recordedAt),
    source: accountNumberOf(transfer.sourceAccountId),
    destination: accountNumberOf(transfer.destinationAccountId),
    feeAccount: transfer.feeAccountId ? accountNumberOf(transfer.feeAccountId) : undefined,
    amount: amountText(transfer.amount, transfer.sourceCurrency, placesOf(transfer.sourceCurrency)),
    converted: amountText(transfer.convertedAmount, transfer.destinationCurrency, placesOf(transfer.destinationCurrency)),
    // A same-currency transfer carries no rate.
    rate: transfer.exchangeRate ?? '—',
    fee: amountText(transfer.fee, transfer.sourceCurrency, placesOf(transfer.sourceCurrency)),
  };
}

const mono = (value: string): JSX.Element => createElement(Mono, null, value);

/** `queryAs` names the service's own transfer sort keys (`SpecGetTransfer.cs`). */
export const TRANSFER_COLUMNS: LedgerColumn<TransferView>[] = [
  { key: 'recordedAt', header: 'Recorded at', sortable: true, queryAs: 'RecordedAt' },
  { key: 'source', header: 'Source', render: (row) => mono(row.source) },
  { key: 'destination', header: 'Destination', render: (row) => mono(row.destination) },
  { key: 'amount', header: 'Amount', sortable: true, queryAs: 'Amount', align: 'right' },
  { key: 'converted', header: 'Converted amount', sortable: true, queryAs: 'ConvertedAmount', align: 'right' },
  { key: 'rate', header: 'Rate', align: 'right' },
  { key: 'fee', header: 'Fee', sortable: true, queryAs: 'Fee', align: 'right' },
];

export interface TransfersTableProps {
  rows: TransferView[];
  orderBy: string;
  desc: boolean;
  onSort: (field: string) => void;
  selectedId?: string;
  onSelectRow: (row: TransferView) => void;
  loading: boolean;
  placeholderRows: number;
  emptyMessage: string;
}

export function TransfersTable({ rows, orderBy, desc, onSort, selectedId, onSelectRow, loading, placeholderRows, emptyMessage }: TransfersTableProps): JSX.Element {
  return (
    <LedgerTable<TransferView>
      columns={TRANSFER_COLUMNS}
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
    />
  );
}
