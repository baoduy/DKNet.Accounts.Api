import type { CSSProperties, JSX, ReactNode } from 'react';
import { cn } from '@/components/ui/utils';
import { Table, TableBody, TableCell, TableEmptyRow, TableHead, TableHeader, TablePlaceholderRows, TableRow, fixedLayout, loadingTableProps, selectableRowProps } from '@/components/ui/table';

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
  /** The rows are still being read: the headings stay and placeholder rows stand in (R1). */
  loading?: boolean;
  /** How many placeholder rows stand in while loading — the list's page size. */
  placeholderRows?: number;
  style?: CSSProperties;
}

/** The console's list page size (`AccountsScreen`, `RecordsScreen`, `ACCOUNT_GROUPS_PAGE_SIZE`). */
export const LIST_PLACEHOLDER_ROWS = 10;

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
  loading = false,
  placeholderRows = LIST_PLACEHOLDER_ROWS,
  style,
}: LedgerTableProps<T>): JSX.Element {
  const layout = fixedLayout(columns.length);
  return (
    <Table className={layout.className} style={{ ...layout.style, ...style }} {...loadingTableProps(loading)}>
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
                  // `w-full`: a header label is often narrower than its column's row content
                  // (e.g. "Name" heading over "Shared 001" cells) — an inline button sized to
                  // its own text leaves the rest of the `<th>` unclickable, so a click
                  // anywhere in the header cell, not just directly on the label text, misses
                  // the button entirely.
                  <button
                    type="button"
                    onClick={() => onSort(field)}
                    className={cn('w-full font-semibold', column.align === 'right' ? 'text-right' : 'text-left')}
                  >
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
        {loading ? <TablePlaceholderRows columns={columns.length} count={placeholderRows} /> : null}
        {!loading && rows.length === 0 ? <TableEmptyRow columns={columns.length}>{emptyMessage}</TableEmptyRow> : null}
        {(loading ? [] : rows).map((row, index) => {
          const id = keyOf(row, rowKey, index);
          return (
            <TableRow
              key={id}
              data-state={selectedId != null && String(selectedId) === id ? 'selected' : undefined}
              {...selectableRowProps(onSelectRow ? () => onSelectRow(row) : undefined)}
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
