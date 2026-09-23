/**
 * DRK-1684 §3 row 4 — the set of ledger routes the console's pass-through endpoint may
 * forward, derived from `contract/openapi.json` (never hand-maintained). `app/api/ledger/
 * [...route]/route.ts` (row 5) checks every inbound request against this before making any
 * outbound call.
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build turns
 * `37-console-refuses-route-outside-contract.spec.ts` green by replacing this stub.
 */
export type LedgerHttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface LedgerRoute {
  method: LedgerHttpMethod;
  /** e.g. `/accounts/{id}/balance` — the contract's own path template. */
  pathTemplate: string;
}

/** Every route the generated contract declares. */
export function allowedLedgerRoutes(): LedgerRoute[] {
  throw new Error('Not implemented: DRK-1684 §3 row 4 — route allowlist from the generated contract');
}

/** Whether `method` + `routeSegments` (from `[...route]`) matches a route the contract declares. */
export function isLedgerRouteAllowed(_method: string, _routeSegments: string[]): boolean {
  throw new Error('Not implemented: DRK-1684 §3 row 4 — route allowlist from the generated contract');
}
