import type { CSSProperties, JSX, ReactNode } from 'react';
import { cn } from '@/components/ui/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatAmount, Money } from '@/components/ledger/Money';
import { PostingNumber } from '@/components/ledger/AccountNumber';

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
  /** `false` drops the running-balance column, header and cell — some screens (the account
   * detail screen's posting list, DRK-1696 §3 row 1) forbid it entirely. */
  showBalanceAfter?: boolean;
  style?: CSSProperties;
}

export function StatementTable({
  rows,
  decimalPlaces = 2,
  selectedId,
  onSelectRow,
  postingHref,
  emptyMessage = 'No postings recorded on this account.',
  showBalanceAfter = true,
  style,
}: StatementTableProps): JSX.Element {
  if (rows.length === 0) {
    return <p style={style}>{emptyMessage}</p>;
  }

  return (
    <Table style={style}>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Posting</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {showBalanceAfter ? <TableHead className="text-right">Balance after</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const id = row.id ?? String(index);
          const reversed = row.status === 'Reversed';
          return (
            <TableRow
              key={id}
              data-state={selectedId != null && selectedId === id ? 'selected' : undefined}
              className={onSelectRow ? 'cursor-pointer' : undefined}
              onClick={onSelectRow ? () => onSelectRow(row) : undefined}
            >
              <TableCell>{row.effectiveDate}</TableCell>
              <TableCell>
                <PostingNumber value={row.postingNumber} href={postingHref?.(row)} reversed={reversed} />
              </TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell className="text-right">
                <Money amount={row.signedAmount} decimalPlaces={decimalPlaces} signed align="right" struck={reversed} />
              </TableCell>
              {showBalanceAfter ? (
                <TableCell className={cn('text-right tabular-nums', reversed && 'text-muted-foreground')}>
                  {formatAmount(row.balanceAfter, decimalPlaces)}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
