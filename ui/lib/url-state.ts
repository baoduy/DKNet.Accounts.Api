/**
 * DRK-1684 §3 row 13 — a list screen's filters, sort, page and open record live in the page
 * address, so the screen round-trips through a copied link.
 */
export interface ListViewState {
  filters: Record<string, string>;
  sort?: { field: string; desc: boolean };
  page?: number;
  openRecordId?: string;
}

const SORT_PARAM = 'sort';
const PAGE_PARAM = 'page';
const OPEN_PARAM = 'open';
const RESERVED_PARAMS = new Set([SORT_PARAM, PAGE_PARAM, OPEN_PARAM]);

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
  if (state.openRecordId) searchParams.set(OPEN_PARAM, state.openRecordId);
  return searchParams;
}
