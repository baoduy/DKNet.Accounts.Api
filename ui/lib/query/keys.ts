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
