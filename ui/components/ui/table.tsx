import type { ComponentProps, CSSProperties, JSX, KeyboardEvent, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/ui/utils';

export function Table({ className, ...props }: ComponentProps<'table'>): JSX.Element {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>): JSX.Element {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>): JSX.Element {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>): JSX.Element {
  return (
    <tr
      data-slot="table-row"
      className={cn('border-b border-border hover:bg-surface-hover data-[state=selected]:bg-surface-selected', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<'th'>): JSX.Element {
  return (
    <th
      data-slot="table-head"
      className={cn('h-(--row-height) px-(--cell-padding-x) text-left align-middle font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>): JSX.Element {
  // A fixed row height, not padding around the content: a row is 44px whatever it holds (up to two
  // lines), so a placeholder row and the row that replaces it are the same height (DRK-1725 R1).
  return <td data-slot="table-cell" className={cn('h-(--row-height) px-(--cell-padding-x) align-middle', className)} {...props} />;
}

/**
 * DRK-1725 R1 — a table whose rows arrive after its headings is laid out from its headings alone
 * (`table-layout: fixed`), so a column never widens or narrows when the data comes in and no
 * heading moves. It is at least `--spacing` × 24 wide per column; a narrower card scrolls the
 * table (Design/README.md: "A wide table is a scroll region, never an overflow").
 */
export function fixedLayout(columns: number): { className: string; style: CSSProperties } {
  return { className: 'table-fixed', style: { minWidth: `calc(${columns} * var(--spacing) * 24)` } };
}

/**
 * A table whose rows are still being read is a placeholder, not data: hidden from assistive
 * technology and inert (its sort buttons take no focus) until the rows arrive, while it is drawn
 * exactly where the loaded table will be.
 */
export function loadingTableProps(loading: boolean): Pick<ComponentProps<'table'>, 'aria-hidden' | 'inert'> {
  return loading ? { 'aria-hidden': true, inert: true } : {};
}

/**
 * DRK-1725 R1 — while a table's rows are read it keeps its headings and shows `count` rows of
 * static placeholders, each at the fixed row height of the rows that replace them (`TableCell`), so
 * nothing moves when the data arrives.
 */
export function TablePlaceholderRows({ columns, count }: { columns: number; count: number }): JSX.Element {
  return (
    <>
      {Array.from({ length: count }, (_, row) => (
        <TableRow key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <TableCell key={column}>
              <Skeleton className="w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** DRK-1725 R1 — an empty table keeps its headings and says why in one full-width body row. */
export function TableEmptyRow({ columns, children }: { columns: number; children: ReactNode }): JSX.Element {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

/**
 * A row that opens something is a tab stop, and Enter or Space opens it as a click does
 * (DRK-1725 §3 "every control must work with the keyboard alone"). A key pressed on a link or
 * button inside the row is that control's own.
 */
export function selectableRowProps(onSelect: (() => void) | undefined): Pick<ComponentProps<'tr'>, 'tabIndex' | 'onClick' | 'onKeyDown' | 'className'> {
  if (!onSelect) return {};
  return {
    tabIndex: 0,
    className: 'cursor-pointer',
    onClick: onSelect,
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      onSelect();
    },
  };
}
