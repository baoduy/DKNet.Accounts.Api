/**
 * DRK-1697 §3 row 8 — typed read layer over `/api/ledger/account-groups*`. Maps a
 * `ListViewState` to the list query surface (`filter=…`, `orderBy`, `desc`, `pageNumber`) and
 * parses every response body through `readLedgerJson` (row 7), so a balance never passes
 * through a JS `number`. Build stage implements the bodies; this stub only pins the shapes
 * `AccountGroupsScreen` (row 11) compiles against.
 */
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
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  hasNextPage: boolean;
}

export async function fetchAccountGroups(_state: ListViewState): Promise<PagedAccountGroups> {
  throw new Error('Not implemented — DRK-1697 Build stage (row 8).');
}

export async function fetchAccountGroup(_groupId: string): Promise<AccountGroup> {
  throw new Error('Not implemented — DRK-1697 Build stage (row 8).');
}

export async function fetchAccountGroupBalances(_groupId: string): Promise<AccountGroupBalance[]> {
  throw new Error('Not implemented — DRK-1697 Build stage (row 8).');
}
