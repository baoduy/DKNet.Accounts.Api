import type { CSSProperties, JSX, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBar } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import type { PaginationProps } from '@/components/ui/pagination';
import { Caption } from '@/components/ui/text';

export interface TableCardProps {
  /** The search field's placeholder — also its accessible name. Omit for a card with no search. */
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Rows shown and rows in total: `6 of 214`. The count shows only when both are given. */
  rows?: number;
  total?: number;
  /** The `FilterMenu`, at the right of the top bar. */
  filter?: ReactNode;
  /** The pager at the foot; omit for an unpaged table. */
  pagination?: PaginationProps;
  /**
   * The `DetailPanel`. It is drawn full height over the frame's right edge, held to the viewport,
   * so a short list never clips it and a long one scrolls beneath it. Nothing behind it is dimmed.
   */
  panel?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** The list screens' table card: search, count and filter above the table, the pager below. Composed per the Design/ui_kits list pages. */
export function TableCard({
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
  rows,
  total,
  filter,
  pagination,
  panel,
  children,
  className,
  style,
}: TableCardProps): JSX.Element {
  const hasTopBar = searchPlaceholder !== undefined || (rows !== undefined && total !== undefined) || filter !== undefined;
  return (
    <div style={style} className={className}>
      <Card padded={false}>
        {hasTopBar ? (
          <CardBar position="top">
            {searchPlaceholder !== undefined ? (
              <>
                <Input
                  type="search"
                  prefix={<Search size={14} />}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  value={searchValue}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  className="w-68"
                />
                {searchValue ? (
                  <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onSearchChange?.('')}>
                    Clear
                  </Button>
                ) : null}
              </>
            ) : null}
            {rows !== undefined && total !== undefined ? (
              <Caption className="ml-auto">
                {rows} of {total}
              </Caption>
            ) : null}
            {filter ? <div className={rows !== undefined && total !== undefined ? undefined : 'ml-auto'}>{filter}</div> : null}
          </CardBar>
        ) : null}
        {children}
        {pagination ? <Pagination {...pagination} /> : null}
      </Card>
      {panel ? (
        // A grid, so the one child it holds — the panel, or a screen's focus wrapper around it —
        // stretches to the full height. The slot itself lets the pointer through to the page.
        <div data-slot="panel-slot" className="pointer-events-none fixed inset-y-0 right-0 z-50 grid w-(--drawer-width) max-w-[92%] *:pointer-events-auto">
          {panel}
        </div>
      ) : null}
    </div>
  );
}
