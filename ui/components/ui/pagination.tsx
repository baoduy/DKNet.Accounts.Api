import type { CSSProperties, JSX, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CardBar } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Caption } from '@/components/ui/text';

export interface PaginationProps {
  /** 1-based current page. */
  page?: number;
  /** Total pages. `Page 2 of 7` reads from this. */
  pageCount?: number;
  pageSize?: number;
  /** Offered in the rows-per-page select. */
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Optional extra count beside rows-per-page, e.g. `6 of 214`. */
  summary?: ReactNode;
  /** Which end of the card it sits at — drives which edge carries the hairline. */
  position?: 'top' | 'bottom';
  /** Overrides the page-derived enablement — only for a cursor-paged route that cannot know its page count. */
  canPrevious?: boolean;
  canNext?: boolean;
  style?: CSSProperties;
}

function PagerButton({ icon: Icon, label, disabled, onClick }: { icon: LucideIcon; label: string; disabled: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-7.5 items-center justify-center rounded-full border border-border-control bg-card text-foreground outline-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-text-disabled disabled:hover:bg-surface-disabled"
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

/**
 * The pager strip at the foot of a table card, built on `CardBar` so it shares the filter
 * bar's inset and hairline. Ends disable rather than disappear, so the row never reflows.
 * Ported from Design/components/core/Pagination.jsx.
 */
export function Pagination({
  page = 1,
  pageCount = 1,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  summary,
  position = 'bottom',
  canPrevious,
  canNext,
  style,
}: PaginationProps): JSX.Element {
  const last = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), last);
  const previousOk = canPrevious ?? current > 1;
  const nextOk = canNext ?? current < last;
  const go = (target: number): void => onPageChange?.(Math.min(Math.max(1, target), last));
  return (
    <CardBar position={position} role="navigation" aria-label="Pagination" style={style}>
      <Caption className="whitespace-nowrap" aria-hidden="true">
        Rows per page
      </Caption>
      <Select
        options={pageSizeOptions.map(String)}
        value={String(pageSize)}
        aria-label="Rows per page"
        onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
      />
      {summary ? <Caption className="ml-4 whitespace-nowrap">{summary}</Caption> : null}
      <span className="ml-auto flex items-center gap-5">
        <Caption className="whitespace-nowrap">
          Page {current} of {last}
        </Caption>
        <span className="flex items-center gap-2">
          <PagerButton icon={ChevronsLeft} label="First page" disabled={!previousOk} onClick={() => go(1)} />
          <PagerButton icon={ChevronLeft} label="Previous page" disabled={!previousOk} onClick={() => go(current - 1)} />
          <PagerButton icon={ChevronRight} label="Next page" disabled={!nextOk} onClick={() => go(current + 1)} />
          <PagerButton icon={ChevronsRight} label="Last page" disabled={!nextOk} onClick={() => go(last)} />
        </span>
      </span>
    </CardBar>
  );
}
