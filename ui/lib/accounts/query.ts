/**
 * DRK-1696 §3 row 6 — account read hooks, through `/api/ledger/...` (the pass-through), read with
 * `readLedger` so a money field never routes through `Number`. `useAccount`
 * resolves a non-guid via `filter=AccountNumber:Equal:<value>` and returns a distinct
 * not-found on an empty page — never the first row. A refused read throws (DRK-1704 finding 5),
 * so the screen shows the service's own wording instead of guessing.
 */
'use client';

import { keepPreviousData, useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ledgerFetch, readLedger } from '@/lib/api/ledger-request';
import { readLedgerJson, type AsRead } from '@/lib/api/money-json';
import { refusalError } from '@/lib/api/refusal';
import type { components } from '@/lib/api/schema';
import { accountBalanceKey, accountKey, accountsListKey, postingsListKey } from '@/lib/query/keys';
import type { ListViewState } from '@/lib/url-state';
import { toAccountsQuery } from './filters';
import { toPostingsQuery, type PostingsFilterState } from './postings-filter';

export type AccountDto = AsRead<components['schemas']['AccountDto']>;
export type AccountGroupDto = AsRead<components['schemas']['AccountGroupDto']>;
export type AccountBalanceDto = AsRead<components['schemas']['AccountBalanceDto']>;
export type PostingDto = AsRead<components['schemas']['PostingDto']>;
export type PagedAccountResponse = AsRead<components['schemas']['PagedAccountResponse']>;
export type PagedPostingResponse = AsRead<components['schemas']['PagedPostingResponse']>;

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useAccounts(state: ListViewState, pageSize?: number): UseQueryResult<PagedAccountResponse> {
  const query = toAccountsQuery(state, pageSize);
  return useQuery({
    queryKey: accountsListKey({ ...state, pageSize }),
    queryFn: async () => (await readLedger(`/api/ledger/accounts?${query!.toString()}`)) as PagedAccountResponse,
    enabled: query !== null,
    // A filter/sort/page change swaps the query key — without this the list would flash to
    // empty between the old and new response instead of holding the previous rows.
    placeholderData: keepPreviousData,
  });
}

export interface AccountLookup {
  found: boolean;
  account?: AccountDto;
}

async function lookupAccount(idOrNumber: string): Promise<AccountLookup> {
  if (GUID_PATTERN.test(idOrNumber)) {
    const response = await ledgerFetch(`/api/ledger/accounts/${idOrNumber}`);
    // 404 is the only "not found" — any other refusal (401, 403, 500, ...) throws instead
    // of being mistaken for one (DRK-1704 finding 5).
    if (response.status === 404) return { found: false };
    const body = await readLedgerJson(response);
    if (!response.ok) throw refusalError(body);
    return { found: true, account: body as AccountDto };
  }
  const params = new URLSearchParams({ filter: `AccountNumber:Equal:${idOrNumber}` });
  const page = (await readLedger(`/api/ledger/accounts?${params.toString()}`)) as PagedAccountResponse;
  const account = page.items[0];
  return account ? { found: true, account } : { found: false };
}

export function useAccount(idOrNumber: string): UseQueryResult<AccountLookup> {
  return useQuery({ queryKey: accountKey(idOrNumber), queryFn: () => lookupAccount(idOrNumber) });
}

/** DRK-1713 §3 row 6 — the accounts a page of postings names, one cached read per account id
 * (the same key `useAccount` uses), so a row can show the account number rather than its guid. */
export function useAccountsById(ids: string[]): UseQueryResult<AccountLookup>[] {
  return useQueries({ queries: ids.map((id) => ({ queryKey: accountKey(id), queryFn: () => lookupAccount(id) })) });
}

/** DRK-1696 §3 row 3 — `GET /accounts/{id}/balance`, keyed so a reversal or a record on this
 * account (`lib/query/mutations.ts`) invalidates the same cached copy the detail screen reads. */
export function useAccountBalance(accountId: string): UseQueryResult<AccountBalanceDto> {
  return useQuery({
    queryKey: accountBalanceKey(accountId),
    queryFn: async () => (await readLedger(`/api/ledger/accounts/${accountId}/balance`)) as AccountBalanceDto,
    enabled: accountId.length > 0,
  });
}

/** DRK-1696 §3 row 3 — `GET /postings`, narrowed to this account and the operator's period +
 * direction/category/status filter. A period the service would refuse produces no call. */
export function usePostings(accountId: string, filter: PostingsFilterState, pageSize?: number, acrossAccounts = false): UseQueryResult<PagedPostingResponse> {
  const query = toPostingsQuery(accountId, filter, pageSize);
  return useQuery({
    queryKey: postingsListKey({ accountId, ...filter, pageSize }),
    queryFn: async () => (await readLedger(`/api/ledger/postings?${query!.toString()}`)) as PagedPostingResponse,
    enabled: query !== null && (accountId.length > 0 || acrossAccounts),
    placeholderData: keepPreviousData,
  });
}

/** DRK-1713 §3 row 4 — `GET /postings` across every account (no `accountId`), with the Records
 * screen's search, sort and page. Keyed under `postingsListKey`, so a record or reverse
 * (`lib/query/mutations.ts`) refreshes it. */
export function useRecords(filter: PostingsFilterState, pageSize?: number): UseQueryResult<PagedPostingResponse> {
  return usePostings('', filter, pageSize, true);
}

/** DRK-1713 §3 row 4 — `GET /postings/{id}`, to follow the link between a posting and its
 * reversal when the other one is not on the listed page. Keyed under `postingsListKey` too, so
 * the same writes that refresh the lists refresh it. */
export function usePosting(postingId: string | null | undefined): UseQueryResult<PostingDto> {
  return useQuery({
    queryKey: postingsListKey({ postingId }),
    queryFn: async () => (await readLedger(`/api/ledger/postings/${postingId}`)) as PostingDto,
    enabled: !!postingId,
  });
}
