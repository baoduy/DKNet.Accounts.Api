import type { CSSProperties, ReactNode } from 'react';

/**
 * The pager strip at the foot of a table card — a `CardBar` with paging controls, so it
 * shares the bar's inset, vertical rhythm and hairline exactly. Rows per page sits on the
 * left; the page position and four round steppers (first, previous, next, last) sit on the
 * right. At either end the steppers disable rather than disappear.
 * Note the two paging contracts: list routes use `pageNumber`/`pageSize`, the statement
 * route uses `pageIndex`/`pageSize`.
 */
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
export declare function Pagination(props: PaginationProps): JSX.Element;
