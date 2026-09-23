/**
 * DRK-1684 §3 row 8 — one query key per resource, so a list and the panel opened over it
 * share one cached copy instead of each minting its own key shape.
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build turns
 * `35-a-list-and-the-panel-opened-over-it-show-the-same-balance.spec.ts` green by replacing
 * this stub.
 */
export function accountBalanceKey(_accountId: string): readonly unknown[] {
  throw new Error('Not implemented: DRK-1684 §3 row 8 — query keys');
}

export function accountsListKey(_filters: Record<string, unknown>): readonly unknown[] {
  throw new Error('Not implemented: DRK-1684 §3 row 8 — query keys');
}

export function postingsListKey(_filters: Record<string, unknown>): readonly unknown[] {
  throw new Error('Not implemented: DRK-1684 §3 row 8 — query keys');
}

export function currenciesKey(): readonly unknown[] {
  throw new Error('Not implemented: DRK-1684 §3 row 8 — query keys');
}
