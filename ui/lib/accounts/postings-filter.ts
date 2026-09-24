/**
 * DRK-1696 §3 row 2 — the detail screen's posting list period + narrowing, translated to
 * `GET /v1/postings`'s own query surface (README.md: a required `from`/`to` window of at
 * most 90 days; narrows on `accountId` (guid), `direction`, `category`, `status`).
 */
export const MAX_POSTING_PERIOD_DAYS = 90;
export const DEFAULT_POSTING_PERIOD_DAYS = 30;

export const POSTING_DIRECTIONS = ['Credit', 'Debit'] as const;
export const POSTING_CATEGORIES = ['Transfer', 'Payment', 'Fee', 'Interest', 'Adjustment', 'Refund', 'Reversal', 'OpeningBalance'] as const;
export const POSTING_STATUSES = ['Posted', 'Reversed'] as const;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `null` when the period is acceptable — the service refuses anything wider than 90 days,
 * unset, unparseable, or inverted (pr-reviewer DRK-1704 findings 1/14). */
export function postingPeriodError(from: string, to: string): string | null {
  if (!from || !to) return 'A period must be set.';
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 'A period must be set.';
  if (fromMs > toMs) return 'The period start must not be after its end.';
  const spanDays = Math.round((toMs - fromMs) / 86_400_000);
  return spanDays > MAX_POSTING_PERIOD_DAYS ? `The period may span at most ${MAX_POSTING_PERIOD_DAYS} days.` : null;
}

export const MIN_POSTING_SEARCH_LENGTH = 2;

export interface PostingsFilterState {
  from: string;
  to: string;
  direction: string;
  category: string;
  status: string;
  /** DRK-1713 §3 row 3 — the Records screen's own search, sort and page; the detail screen sets none. */
  search?: string;
  orderBy?: string;
  desc?: boolean;
  pageNumber?: number;
}

/** Opens on the last 30 days, per the decision log ("the detail screen's posting list opens
 * on the last 30 days, because the service requires a period and refuses one wider than 90 days"). */
export function defaultPostingsFilter(now: Date = new Date()): PostingsFilterState {
  const from = new Date(now.getTime() - DEFAULT_POSTING_PERIOD_DAYS * 86_400_000);
  return { from: toDateOnly(from), to: toDateOnly(now), direction: '', category: '', status: '' };
}

/** Screen state → the service's query string. A period over 90 days, or a search term under 2
 * characters, produces no query at all (R2 — no call is ever made for a refused period or term).
 * An empty `accountId` lists postings across every account (DRK-1713 §3 row 3). */
export function toPostingsQuery(accountId: string, filter: PostingsFilterState, pageSize?: number): URLSearchParams | null {
  if (postingPeriodError(filter.from, filter.to) !== null) return null;
  if (filter.search && filter.search.length < MIN_POSTING_SEARCH_LENGTH) return null;

  const params = new URLSearchParams();
  if (accountId) params.set('accountId', accountId);
  params.set('from', filter.from);
  params.set('to', filter.to);
  if (filter.direction) params.set('direction', filter.direction);
  if (filter.category) params.set('category', filter.category);
  if (filter.status) params.set('status', filter.status);
  if (filter.search) params.set('search', filter.search);
  if (filter.orderBy) params.set('orderBy', filter.orderBy);
  if (filter.desc) params.set('desc', 'true');
  if (filter.pageNumber !== undefined) params.set('pageNumber', String(filter.pageNumber));
  if (pageSize !== undefined) params.set('pageSize', String(pageSize));
  return params;
}
