/**
 * DRK-1696 §3 row 6 — account read hooks, through `/api/ledger/...` (the pass-through), body
 * parsed with `parseLedgerJson` so a money field never routes through `Number`. `useAccount`
 * resolves a non-guid via `filter=AccountNumber:Equal:<value>` and returns a distinct
 * not-found on an empty page — never the first row.
 */
'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { parseLedgerJson } from '@/lib/api/json';
import type { components } from '@/lib/api/schema';
import { accountGroupsKey, accountKey, accountsListKey, currenciesQueryOptions } from '@/lib/query/keys';
import type { ListViewState } from '@/lib/url-state';
import { toAccountsQuery } from './filters';

export type AccountDto = components['schemas']['AccountDto'];
export type AccountGroupDto = components['schemas']['AccountGroupDto'];
export type CurrencyDto = components['schemas']['CurrencyDto'];
export type PagedAccountResponse = components['schemas']['PagedAccountResponse'];

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchLedgerJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  return parseLedgerJson(await response.text());
}

export function useAccounts(state: ListViewState, pageSize?: number): UseQueryResult<PagedAccountResponse> {
  const query = toAccountsQuery(state, pageSize);
  return useQuery({
    queryKey: accountsListKey({ ...state, pageSize }),
    queryFn: async () => (await fetchLedgerJson(`/api/ledger/accounts?${query!.toString()}`)) as PagedAccountResponse,
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

export function useAccount(idOrNumber: string): UseQueryResult<AccountLookup> {
  return useQuery({
    queryKey: accountKey(idOrNumber),
    queryFn: async (): Promise<AccountLookup> => {
      if (GUID_PATTERN.test(idOrNumber)) {
        const response = await fetch(`/api/ledger/accounts/${idOrNumber}`);
        if (response.status === 404) return { found: false };
        return { found: true, account: parseLedgerJson(await response.text()) as AccountDto };
      }
      const params = new URLSearchParams({ filter: `AccountNumber:Equal:${idOrNumber}` });
      const page = (await fetchLedgerJson(`/api/ledger/accounts?${params.toString()}`)) as PagedAccountResponse;
      const account = page.items[0];
      return account ? { found: true, account } : { found: false };
    },
  });
}

export function useAccountGroups(): UseQueryResult<AccountGroupDto[]> {
  return useQuery({
    queryKey: accountGroupsKey(),
    queryFn: async () => {
      const page = (await fetchLedgerJson('/api/ledger/account-groups')) as { items: AccountGroupDto[] };
      return page.items;
    },
  });
}

export function useCurrencies(): UseQueryResult<CurrencyDto[]> {
  return useQuery({
    ...currenciesQueryOptions(),
    queryFn: async () => (await fetchLedgerJson('/api/ledger/currencies')) as CurrencyDto[],
  });
}
