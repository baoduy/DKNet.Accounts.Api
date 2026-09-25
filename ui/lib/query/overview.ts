/**
 * DRK-1728 §3 row 10 — the reads behind Overview and the search: status counts, posting counts
 * per window, the windows themselves (weeks and months in UTC, R4), record lookups by id and the
 * free-text search. Every figure is the service's own count (R1): a posting count is one read of
 * `pageSize=1` whose `totalItemCount` is taken as the figure, never a count of listed rows.
 */
import { type AsRead, readLedgerJson } from '@/lib/api/money-json';
import { LedgerRefusalError, refusalError } from '@/lib/api/refusal';
import type { components } from '@/lib/api/schema';

export type StatusCountResource = 'accounts' | 'account-groups';

export interface StatusCount {
  status: string;
  count: number;
}

/** A window on a date: `YYYY-MM-DD` for postings, ISO timestamps for status counts. */
export interface DateWindow {
  from: string;
  to: string;
}

export interface MonthWindow extends DateWindow {
  /** e.g. `September 2026`. */
  label: string;
}

async function getLedgerJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  const body = await readLedgerJson(response);
  if (!response.ok) throw refusalError(body);
  return body;
}

/**
 * The service's count per status (§3a `StatusCount`). A status comes back upper-case, as the
 * service spells it; `type` is not read (brief Q1). Only `from`/`to` are ever sent (R3).
 * `count` is a small integer, safe to route through `Number` (never money).
 */
export async function fetchStatusCounts(resource: StatusCountResource, window?: DateWindow): Promise<StatusCount[]> {
  const query = window ? `?${new URLSearchParams({ from: window.from, to: window.to }).toString()}` : '';
  const body = (await getLedgerJson(`/api/ledger/${resource}/status-counts${query}`)) as Array<{ status: string; count: string }>;
  return body.map((line) => ({ status: line.status, count: Number(line.count) }));
}

/** How many postings took effect in `window` (both days inclusive) — the service's `totalItemCount`. */
export async function fetchPostingCount(window: DateWindow): Promise<number> {
  const params = new URLSearchParams({ from: window.from, to: window.to, pageSize: '1' });
  const body = (await getLedgerJson(`/api/ledger/postings?${params.toString()}`)) as { totalItemCount: string };
  return Number(body.totalItemCount);
}

/** A list route whose page carries the service's `totalItemCount`. */
export type TotalResource = 'accounts' | 'account-groups' | 'currencies';

/**
 * The service's own count of every row `resource` holds under `params` — one read of a page of 1
 * (`/currencies` takes no query and is read bare), its `totalItemCount` taken as the figure (R1).
 */
export async function fetchListTotal(resource: TotalResource, params: Record<string, string> = {}): Promise<number> {
  const query = resource === 'currencies' ? '' : `?${new URLSearchParams({ ...params, pageSize: '1' }).toString()}`;
  const body = (await getLedgerJson(`/api/ledger/${resource}${query}`)) as { totalItemCount: string };
  return Number(body.totalItemCount);
}

/** The Overview's activity window (DRK-1745 §3): a number of days, or `all`. */
export type ActivityWindow = '7' | '30' | '90' | 'all';

export const ACTIVITY_WINDOWS: Array<{ value: ActivityWindow; label: string }> = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All time' },
];

/** The posting list answers a window of at most 90 days, so `All time` reads the last 90. */
export const LONGEST_POSTING_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The window's posting reads: its last `days` days in UTC, both inclusive, today the last. */
export function activityPostingWindow(now: Date, window: ActivityWindow): DateWindow {
  const days = window === 'all' ? LONGEST_POSTING_DAYS : Number(window);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { from: utcDay(today - (days - 1) * DAY_MS), to: utcDay(today) };
}

/** The window's `fromDate` on the group list — the start of its first UTC day; `All time` the earliest date. */
export function activityFromDate(now: Date, window: ActivityWindow): string {
  if (window === 'all') return '0001-01-01T00:00:00Z';
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - (Number(window) - 1) * DAY_MS).toISOString();
}

/** The last 13 weeks of 7 days, oldest first, the latest ending today in UTC. */
export function postingWeeks(now: Date): DateWindow[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: 13 }, (_, index) => {
    const end = today - (12 - index) * 7 * DAY_MS;
    return { from: utcDay(end - 6 * DAY_MS), to: utcDay(end) };
  });
}

/** The current month and the 11 before it, oldest first, each the whole UTC month (both bounds inclusive). */
export function openedMonths(now: Date): MonthWindow[] {
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, index) => {
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1);
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index) + 1, 1);
    return { label: monthLabel.format(start), from: new Date(start).toISOString(), to: new Date(next - 1).toISOString() };
  });
}

export type LedgerRecordLookup<T> = { state: 'found'; record: T } | { state: 'notFound' } | { state: 'forbidden'; error: LedgerRefusalError };

/** Reads one record by id: 404 is "not found", 403 "not permitted"; any other refusal throws. */
export async function lookupRecord<T>(path: string): Promise<LedgerRecordLookup<T>> {
  const response = await fetch(path);
  if (response.status === 404) return { state: 'notFound' };
  const body = await readLedgerJson(response);
  if (response.status === 403) return { state: 'forbidden', error: refusalError(body) };
  if (!response.ok) throw refusalError(body);
  return { state: 'found', record: body as T };
}

export type AccountDto = AsRead<components['schemas']['AccountDto']>;
export type AccountGroupDto = AsRead<components['schemas']['AccountGroupDto']>;
export type PostingDto = AsRead<components['schemas']['PostingDto']>;

export interface SearchMatches<T> {
  items: T[];
  /** The service's own count of every match, not of the page shown. */
  total: number;
}

export const SEARCH_PAGE_SIZE = 10;

async function searchList<T>(resource: StatusCountResource, text: string): Promise<SearchMatches<T>> {
  const params = new URLSearchParams({ search: text, pageSize: String(SEARCH_PAGE_SIZE) });
  const body = (await getLedgerJson(`/api/ledger/${resource}?${params.toString()}`)) as { items: T[]; totalItemCount: string };
  return { items: body.items, total: Number(body.totalItemCount) };
}

/** Accounts and groups matching `text`, up to 10 of each, with the service's total for each. */
export async function searchAccountsAndGroups(text: string): Promise<{ accounts: SearchMatches<AccountDto>; groups: SearchMatches<AccountGroupDto> }> {
  const [accounts, groups] = await Promise.all([searchList<AccountDto>('accounts', text), searchList<AccountGroupDto>('account-groups', text)]);
  return { accounts, groups };
}

/** Whether any account carries exactly this account number. */
export async function accountNumberExists(accountNumber: string): Promise<boolean> {
  const params = new URLSearchParams({ filter: `AccountNumber:Equal:${accountNumber}`, pageSize: '1' });
  const body = (await getLedgerJson(`/api/ledger/accounts?${params.toString()}`)) as { totalItemCount: string };
  return Number(body.totalItemCount) > 0;
}
