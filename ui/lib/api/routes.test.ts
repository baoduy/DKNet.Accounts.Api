import { describe, expect, it } from 'vitest';
import { allowedLedgerRoutes, isLedgerRouteAllowed } from './routes';

describe('allowedLedgerRoutes', () => {
  it('derives every operation the committed contract declares', () => {
    const routes = allowedLedgerRoutes();
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/accounts/balances' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/accounts/{id}/balance' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/accounts/{id}/statement' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/postings' });
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/postings' });
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/postings/{id}/reverse' });
    // DRK-1713 §3 row 1 — reading one posting, to follow a posting to its reversal.
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/postings/{id}' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/currencies' });
    // DRK-1696 §3 row 1 — the accounts screen's own widening of the allowlist.
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/accounts' });
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/accounts' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/accounts/{id}' });
    expect(routes).toContainEqual({ method: 'PUT', pathTemplate: '/accounts/{id}' });
    expect(routes).toContainEqual({ method: 'PATCH', pathTemplate: '/accounts/{id}' });
    // DRK-1697 — the groups/currencies screens' own widening of the allowlist.
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/currencies' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/currencies/{id}' });
    expect(routes).toContainEqual({ method: 'PUT', pathTemplate: '/currencies/{id}' });
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/currencies/{id}/activate' });
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/currencies/{id}/deactivate' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/account-groups' });
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/account-groups' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/account-groups/{id}' });
    expect(routes).toContainEqual({ method: 'PUT', pathTemplate: '/account-groups/{id}' });
    expect(routes).toContainEqual({ method: 'DELETE', pathTemplate: '/account-groups/{id}' });
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/account-groups/{id}/close' });
    expect(routes).toContainEqual({ method: 'POST', pathTemplate: '/account-groups/{id}/activate' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/account-groups/{id}/balances' });
    // DRK-1728 §3 row 1 — the two status counts Overview reads.
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/accounts/status-counts' });
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/account-groups/status-counts' });
    expect(routes).toHaveLength(28);
  });
});

describe('PUT support (DRK-1697 §3 row 4)', () => {
  it('accepts PUT as a declared route method', () => {
    expect(isLedgerRouteAllowed('PUT', ['account-groups', '11111111-1111-4111-8111-111111111111'])).toBe(true);
    expect(isLedgerRouteAllowed('put', ['currencies', '11111111-1111-4111-8111-111111111111'])).toBe(true);
  });
});

describe('isLedgerRouteAllowed', () => {
  it('matches a static route regardless of method case', () => {
    expect(isLedgerRouteAllowed('get', ['currencies'])).toBe(true);
    expect(isLedgerRouteAllowed('GET', ['currencies'])).toBe(true);
  });

  it('matches a {param} segment against any value', () => {
    expect(isLedgerRouteAllowed('GET', ['accounts', 'ACME-000123', 'balance'])).toBe(true);
    expect(isLedgerRouteAllowed('POST', ['postings', '11111111-1111-4111-8111-111111111111', 'reverse'])).toBe(true);
  });

  it('refuses a route the contract does not declare', () => {
    expect(isLedgerRouteAllowed('GET', ['admin', 'shutdown'])).toBe(false);
  });

  it('refuses the right path with the wrong method', () => {
    expect(isLedgerRouteAllowed('DELETE', ['postings'])).toBe(false);
  });

  it('refuses a path with the wrong segment count, even as a prefix or suffix match', () => {
    expect(isLedgerRouteAllowed('GET', ['accounts', 'ACME-000123', 'balance', 'extra'])).toBe(false);
    // Not `/currencies/extra` or `/postings/extra` — `GET /currencies/{id}` (DRK-1697 §3a) and
    // `GET /postings/{id}` (DRK-1713 §3 row 1) legitimately match any 2-segment path there.
    expect(isLedgerRouteAllowed('GET', ['postings', 'a', 'b'])).toBe(false);
  });

  it('requires every segment to match, not merely one of them', () => {
    // First two segments line up with `/accounts/{id}/balance`; the last does not.
    expect(isLedgerRouteAllowed('GET', ['accounts', 'ACME-000123', 'not-balance'])).toBe(false);
  });
});
