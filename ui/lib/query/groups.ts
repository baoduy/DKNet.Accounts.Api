/**
 * DRK-1697 §3 row 8 — typed read layer over `/api/ledger/account-groups*`. Maps a
 * `ListViewState` to the list query surface (`filter=…`, `orderBy`, `desc`, `pageNumber`) and
 * reads every response through `readLedger` (row 7), so a balance never passes through a JS
 * `number`. DRK-1760 §3 row 3 — the hooks below are the only way a screen reads a group.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AccountGroupDto } from '@/lib/accounts/query';
import { readLedger } from '@/lib/api/ledger-request';
import type { ListViewState } from '@/lib/url-state';
import { accountGroupBalancesKey, accountGroupKey, accountGroupsKey, accountGroupsListKey } from './keys';

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
 * The groups list's default page size (`Design/ui_kits/account-groups-crud/AccountGroups.jsx`'s
 * own default) until the operator picks another in the pager. The screen always sends a page
 * size, so the service pages the list and the pager's `Page N of M` is the service's own count.
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
  return toPagedAccountGroups(await readLedger(`/api/ledger/account-groups?${buildGroupsSearchParams(state).toString()}`));
}

export async function fetchAccountGroup(groupId: string): Promise<AccountGroup> {
  return (await readLedger(`/api/ledger/account-groups/${encodeURIComponent(groupId)}`)) as AccountGroup;
}

export async function fetchAccountGroupBalances(groupId: string): Promise<AccountGroupBalance[]> {
  return (await readLedger(`/api/ledger/account-groups/${encodeURIComponent(groupId)}/balances`)) as AccountGroupBalance[];
}

/** One page of the groups list, as the screen's view (filters, sort, page, page size) asks for it. */
export function useAccountGroupsPage(state: ListViewState & { pageSize: number }): UseQueryResult<PagedAccountGroups> {
  return useQuery({
    queryKey: accountGroupsListKey({ ...state.filters, sort: state.sort, page: state.page, pageSize: state.pageSize }),
    queryFn: () => fetchAccountGroups(state),
  });
}

export function useAccountGroup(groupId: string | null | undefined): UseQueryResult<AccountGroup> {
  return useQuery({ queryKey: accountGroupKey(groupId ?? ''), queryFn: () => fetchAccountGroup(groupId as string), enabled: groupId != null });
}

export function useAccountGroupBalances(groupId: string | null | undefined, enabled: boolean): UseQueryResult<AccountGroupBalance[]> {
  return useQuery({ queryKey: accountGroupBalancesKey(groupId ?? ''), queryFn: () => fetchAccountGroupBalances(groupId as string), enabled: enabled && groupId != null });
}

/** Every group the service answers with unpaged — the choices a filter or an open-account form offers. */
export function useAccountGroups(): UseQueryResult<AccountGroupDto[]> {
  return useQuery({
    queryKey: accountGroupsKey(),
    queryFn: async () => ((await readLedger('/api/ledger/account-groups')) as { items: AccountGroupDto[] }).items,
  });
}
