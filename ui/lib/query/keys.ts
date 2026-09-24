/**
 * DRK-1684 §3 row 8 — one query key per resource, so a list and the panel opened over it
 * share one cached copy instead of each minting its own key shape.
 */
export function accountBalanceKey(accountId: string): readonly unknown[] {
  return ['ledger', 'account', accountId, 'balance'] as const;
}

export function accountsListKey(filters: Record<string, unknown>): readonly unknown[] {
  return ['ledger', 'accounts', filters] as const;
}

export function postingsListKey(filters: Record<string, unknown>): readonly unknown[] {
  return ['ledger', 'postings', filters] as const;
}

export function currenciesKey(): readonly unknown[] {
  return ['ledger', 'currencies'] as const;
}

export function accountKey(idOrNumber: string): readonly unknown[] {
  return ['ledger', 'account', idOrNumber] as const;
}

/** Every single-account read — the detail screen keys it by number, a write knows only the guid. */
export function accountKeyPrefix(): readonly unknown[] {
  return ['ledger', 'account'] as const;
}

export function accountGroupsKey(): readonly unknown[] {
  return ['ledger', 'account-groups'] as const;
}

/** DRK-1697 §3 row 9 — one key per account-groups resource, mirroring the accounts/postings shapes above. */
export function accountGroupsListKey(filters: Record<string, unknown>): readonly unknown[] {
  return ['ledger', 'account-groups', filters] as const;
}

export function accountGroupKey(groupId: string): readonly unknown[] {
  return ['ledger', 'account-group', groupId] as const;
}

export function accountGroupBalancesKey(groupId: string): readonly unknown[] {
  return ['ledger', 'account-group', groupId, 'balances'] as const;
}

export function currencyKey(currencyId: string): readonly unknown[] {
  return ['ledger', 'currency', currencyId] as const;
}

/** The ledger-wide per-currency totals (`GET /v1/accounts/balances`) — used only to tell whether a currency still holds a balance. */
export function ledgerBalancesKey(): readonly unknown[] {
  return ['ledger', 'accounts', 'balances'] as const;
}

/**
 * DRK-1684 row 7 / pr-reviewer finding 7 (DRK-1687): the currency list is reference data for
 * the session — held at `staleTime: Infinity`, opting out of the global `refetchOnMount:
 * 'always'` / `refetchOnWindowFocus: true` money-query defaults (`lib/query/client.tsx`).
 * Spread into `useQuery`: `useQuery({ ...currenciesQueryOptions(), queryFn })`.
 */
export function currenciesQueryOptions(): { queryKey: readonly unknown[]; staleTime: number; refetchOnMount: false; refetchOnWindowFocus: false } {
  return { queryKey: currenciesKey(), staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false };
}
