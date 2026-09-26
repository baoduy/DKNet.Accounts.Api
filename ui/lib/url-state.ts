/**
 * DRK-1684 §3 row 13 — a list screen's filters, sort, page and open record live in the page
 * address, so the screen round-trips through a copied link.
 */
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface ListViewState {
  filters: Record<string, string>;
  sort?: { field: string; desc: boolean };
  page?: number;
  /**
   * DRK-1697 §3 row 11 — set once the operator engages pagination (a `Next page` /
   * `Previous page` click) so a shared link reproduces the exact page; unset otherwise, so an
   * ordinary narrowed view is never truncated by a page size the operator never asked for.
   */
  pageSize?: number;
  openRecordId?: string;
}

const SORT_PARAM = 'sort';
const PAGE_PARAM = 'page';
const PAGE_SIZE_PARAM = 'pageSize';
const OPEN_PARAM = 'open';
const RESERVED_PARAMS = new Set([SORT_PARAM, PAGE_PARAM, PAGE_SIZE_PARAM, OPEN_PARAM]);

/** Reads a `ListViewState` back out of a page address's search params. */
export function parseListViewState(searchParams: URLSearchParams): ListViewState {
  const filters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (!RESERVED_PARAMS.has(key)) filters[key] = value;
  }

  const state: ListViewState = { filters };

  const sortParam = searchParams.get(SORT_PARAM);
  if (sortParam) {
    const desc = sortParam.startsWith('-');
    state.sort = { field: desc ? sortParam.slice(1) : sortParam, desc };
  }

  const pageParam = searchParams.get(PAGE_PARAM);
  if (pageParam) state.page = Number(pageParam);

  const pageSizeParam = searchParams.get(PAGE_SIZE_PARAM);
  if (pageSizeParam) state.pageSize = Number(pageSizeParam);

  const openParam = searchParams.get(OPEN_PARAM);
  if (openParam) state.openRecordId = openParam;

  return state;
}

/** Serializes a `ListViewState` into search params the address bar shows. */
export function toListViewSearchParams(state: ListViewState): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(state.filters)) {
    searchParams.set(key, value);
  }
  if (state.sort) searchParams.set(SORT_PARAM, `${state.sort.desc ? '-' : ''}${state.sort.field}`);
  if (state.page !== undefined) searchParams.set(PAGE_PARAM, String(state.page));
  if (state.pageSize !== undefined) searchParams.set(PAGE_SIZE_PARAM, String(state.pageSize));
  if (state.openRecordId) searchParams.set(OPEN_PARAM, state.openRecordId);
  return searchParams;
}

/** `state` with `field` narrowed to `value` (dropped when empty), back on the first page. */
export function withFilter(state: ListViewState, field: string, value: string): ListViewState {
  const filters = { ...state.filters };
  if (value) filters[field] = value;
  else delete filters[field];
  return { ...state, filters, page: undefined };
}

/**
 * DRK-1760 §3 row 5 — a screen's view held in the page address: seeded from it on arrival, one
 * history entry per change, and read back from it whenever Back or Forward moves the address (R4).
 * The view is local state first and the address is mirrored through the History API, never Next's
 * router: a router round trip per change lets rapid changes (a sort, then a page) land out of order.
 * `read` must be stable (a module-level function).
 */
export function useAddressState<T>(read: (params: URLSearchParams) => T, href: (view: T) => string): [T, (next: T) => void] {
  // `null` only outside Next's app router (a component test that mounts the screen bare).
  const searchParams = useSearchParams() as URLSearchParams | null;
  const [view, setView] = useState<T>(() => read(searchParams ?? new URLSearchParams()));
  useEffect(() => {
    const onPopState = (): void => setView(read(new URLSearchParams(window.location.search)));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [read]);
  function navigate(next: T): void {
    setView(next);
    window.history.pushState(null, '', href(next));
  }
  return [view, navigate];
}

/** A list screen's `ListViewState` at `path`, kept in the address by `useAddressState`. */
export function useListViewState(path: string): [ListViewState, (next: ListViewState) => void] {
  return useAddressState(parseListViewState, (view) => `${path}?${toListViewSearchParams(view).toString()}`);
}
