/**
 * DRK-1697 §3 row 8 — typed read layer over `/api/ledger/account-groups*`. Maps a
 * `ListViewState` to the list query surface (`filter=…`, `orderBy`, `desc`, `pageNumber`) and
 * parses every response body through `readLedgerJson` (row 7), so a balance never passes
 * through a JS `number`.
 */
import { readLedgerJson } from '@/lib/api/money-json';
import { refusalError } from '@/lib/api/refusal';
import type { ListViewState } from '@/lib/url-state';

export type AccountGroupType = 'Customer' | 'Merchant' | 'Internal' | 'Suspense' | 'Settlement';
export type AccountGroupStatus = 'Active' | 'Closed';

export interface AccountGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: AccountGroupType;
  status: AccountGroupStatus;
  ownerId: string;
  metadata?: Record<string, string>;
}

/** One line per currency — amounts are the exact text the service sent (R1). */
export interface AccountGroupBalance {
  currency: string;
  balance: string;
  available: string;
  held: string;
}

export interface PagedAccountGroups {
  items: AccountGroup[];
  pageNumber: number;
  pageSize: number;
  pageCount: number;
  totalItemCount: number;
  hasNextPage: boolean;
}

/**
 * The page size `84-mai-shares-the-exact-view-she-is-looking-at` assumes
 * (`Design/ui_kits/account-groups-crud/AccountGroups.jsx`'s own default) — sent only once the
 * operator engages pagination (`ListViewState.pageSize` set). An ordinary narrowed view sends
 * no `pageSize` at all, so `83-mai-narrows-the-group-list`'s 12-row match is never truncated
 * by a page size nobody asked for; the generic list surface's own default (`README.md`'s
 * `pageSize`: default `1000`) applies instead.
 */
export const ACCOUNT_GROUPS_PAGE_SIZE = 10;

/** `ownerId` → `OwnerId`: the generic list surface's `Field:Operation:Value` triples are PascalCase. */
function toFilterField(field: string): string {
  return field.charAt(0).toUpperCase() + field.slice(1);
}

function buildGroupsSearchParams(state: ListViewState): URLSearchParams {
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(state.filters)) {
    // `?search=` (the search's "show all" link, DRK-1728 §3 row 9) is the service's own free-text
    // `search`, never a `Search:Equal:` filter.
    if (!value) continue;
    if (field === 'search') params.set('search', value);
    else params.append('filter', `${toFilterField(field)}:Equal:${value}`);
  }
  if (state.sort) {
    params.set('orderBy', toFilterField(state.sort.field));
    params.set('desc', String(state.sort.desc));
  }
  params.set('pageNumber', String(state.page ?? 1));
  if (state.pageSize !== undefined) params.set('pageSize', String(state.pageSize));
  return params;
}

/**
 * `pageNumber`/`pageSize`/`pageCount`/`totalItemCount` are paging counters, not monetary amounts —
 * `readLedgerJson` turned them into digit strings along with every other number in the body
 * (row 7 draws no field-by-field distinction), so it is safe, and necessary, to route them
 * back through `Number` here.
 */
function toPagedAccountGroups(raw: unknown): PagedAccountGroups {
  const body = raw as { items: AccountGroup[]; pageNumber: string; pageSize: string; pageCount: string; totalItemCount: string; hasNextPage: boolean };
  return {
    items: body.items,
    pageNumber: Number(body.pageNumber),
    pageSize: Number(body.pageSize),
    pageCount: Number(body.pageCount),
    totalItemCount: Number(body.totalItemCount),
    hasNextPage: body.hasNextPage,
  };
}

export async function fetchAccountGroups(state: ListViewState): Promise<PagedAccountGroups> {
  const response = await fetch(`/api/ledger/account-groups?${buildGroupsSearchParams(state).toString()}`);
  const body = await readLedgerJson(response);
  if (!response.ok) throw refusalError(body);
  return toPagedAccountGroups(body);
}

export async function fetchAccountGroup(groupId: string): Promise<AccountGroup> {
  const response = await fetch(`/api/ledger/account-groups/${encodeURIComponent(groupId)}`);
  const body = await readLedgerJson(response);
  if (!response.ok) throw refusalError(body);
  return body as AccountGroup;
}

export async function fetchAccountGroupBalances(groupId: string): Promise<AccountGroupBalance[]> {
  const response = await fetch(`/api/ledger/account-groups/${encodeURIComponent(groupId)}/balances`);
  const body = await readLedgerJson(response);
  if (!response.ok) throw refusalError(body);
  return body as AccountGroupBalance[];
}
