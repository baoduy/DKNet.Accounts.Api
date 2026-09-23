import type { CSSProperties, JSX, ReactNode } from 'react';
import { cn } from '@/components/ui/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

function keyOf<T>(row: T, rowKey: LedgerTableProps<T>['rowKey'], index: number): string {
  if (typeof rowKey === 'function') return rowKey(row);
  if (typeof rowKey === 'string') return String((row as Record<string, unknown>)[rowKey]);
  return String(index);
}

export function LedgerTable<T = unknown>({
  columns,
  rows,
  rowKey,
  selectedId,
  onSelectRow,
  orderBy,
  desc = false,
  onSort,
  emptyMessage = 'No rows.',
  style,
}: LedgerTableProps<T>): JSX.Element {
  if (rows.length === 0) {
    return <p style={style}>{emptyMessage}</p>;
  }

  return (
    <Table style={style}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => {
            const field = column.queryAs ?? column.key;
            const isSorted = orderBy === field;
            return (
              <TableHead
                key={column.key}
                className={cn(column.align === 'right' && 'text-right')}
                aria-sort={isSorted ? (desc ? 'descending' : 'ascending') : undefined}
              >
                {column.sortable && onSort ? (
                  <button type="button" onClick={() => onSort(field)} className="font-semibold">
                    {column.header}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const id = keyOf(row, rowKey, index);
          return (
            <TableRow
              key={id}
              data-state={selectedId != null && String(selectedId) === id ? 'selected' : undefined}
              className={onSelectRow ? 'cursor-pointer' : undefined}
              onClick={onSelectRow ? () => onSelectRow(row) : undefined}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={cn(column.align === 'right' && 'text-right')}>
                  {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
