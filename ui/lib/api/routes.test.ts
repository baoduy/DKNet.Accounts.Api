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
    expect(routes).toContainEqual({ method: 'GET', pathTemplate: '/currencies' });
    expect(routes).toHaveLength(7);
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
    expect(isLedgerRouteAllowed('GET', ['accounts'])).toBe(false);
  });

  it('requires every segment to match, not merely one of them', () => {
    // First two segments line up with `/accounts/{id}/balance`; the last does not.
    expect(isLedgerRouteAllowed('GET', ['accounts', 'ACME-000123', 'not-balance'])).toBe(false);
  });
});
