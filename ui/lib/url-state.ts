/**
 * DRK-1684 §3 row 13 — a list screen's filters, sort, page and open record live in the page
 * address, so the screen round-trips through a copied link.
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build turns
 * `41-a-list-view-can-be-shared-as-a-link.spec.ts` green by replacing this stub.
 */
export interface ListViewState {
  filters: Record<string, string>;
  sort?: { field: string; desc: boolean };
  page?: number;
  openRecordId?: string;
}

/** Reads a `ListViewState` back out of a page address's search params. */
export function parseListViewState(_searchParams: URLSearchParams): ListViewState {
  throw new Error('Not implemented: DRK-1684 §3 row 13 — list view URL state');
}

/** Serializes a `ListViewState` into search params the address bar shows. */
export function toListViewSearchParams(_state: ListViewState): URLSearchParams {
  throw new Error('Not implemented: DRK-1684 §3 row 13 — list view URL state');
}
