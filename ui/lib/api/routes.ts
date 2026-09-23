/**
 * DRK-1684 §3 row 4 — the set of ledger routes the console's pass-through endpoint may
 * forward, derived from `contract/openapi.json` (never hand-maintained). `app/api/ledger/
 * [...route]/route.ts` (row 5) checks every inbound request against this before making any
 * outbound call. Method + path-template match; `{param}` segments accept anything.
 */
import contract from '@/contract/openapi.json';

export type LedgerHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface LedgerRoute {
  method: LedgerHttpMethod;
  /** e.g. `/accounts/{id}/balance` — the contract's own path template. */
  pathTemplate: string;
}

const METHOD_KEYS: Record<LedgerHttpMethod, string> = { GET: 'get', POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'delete' };

/** Every route the generated contract declares. */
export function allowedLedgerRoutes(): LedgerRoute[] {
  const routes: LedgerRoute[] = [];
  const paths = contract.paths as Record<string, Record<string, unknown>>;
  for (const [pathTemplate, operations] of Object.entries(paths)) {
    for (const method of Object.keys(METHOD_KEYS) as LedgerHttpMethod[]) {
      if (operations[METHOD_KEYS[method]]) routes.push({ method, pathTemplate });
    }
  }
  return routes;
}

function matchesTemplate(pathTemplate: string, routeSegments: string[]): boolean {
  const templateSegments = pathTemplate.split('/').filter(Boolean);
  if (templateSegments.length !== routeSegments.length) return false;
  return templateSegments.every((segment, index) => {
    const routeSegment = routeSegments[index];
    if (segment.startsWith('{')) {
      // A `{param}` accepts any single path segment's value — never one carrying its own
      // `/` or `\`, which would let it resolve outside the matched template once forwarded.
      return !routeSegment.includes('/') && !routeSegment.includes('\\');
    }
    return segment === routeSegment;
  });
}

/** Whether `method` + `routeSegments` (from `[...route]`) matches a route the contract declares. */
export function isLedgerRouteAllowed(method: string, routeSegments: string[]): boolean {
  const upperMethod = method.toUpperCase();
  return allowedLedgerRoutes().some((route) => route.method === upperMethod && matchesTemplate(route.pathTemplate, routeSegments));
}
