/**
 * pr-reviewer finding 1 (DRK-1687, round 1) — a `{param}` segment carrying its own path
 * separator (`../../admin`, from a percent-decoded `..%2F..%2Fadmin`) matched
 * `/accounts/{id}/balance` unconditionally and would resolve outside `/v1` once forwarded.
 * Fails against `d27fb448` (the pre-fix `matchesTemplate`); passes once a `{param}` segment
 * is required to carry no `/` or `\`.
 */
import { describe, expect, it } from 'vitest';
import { isLedgerRouteAllowed } from './routes';

describe('isLedgerRouteAllowed — a {param} segment must not carry a path separator', () => {
  it('refuses a traversal sitting inside {id} (../../admin)', () => {
    expect(isLedgerRouteAllowed('GET', ['accounts', '../../admin', 'balance'])).toBe(false);
  });

  it('refuses a single segment smuggling a slash', () => {
    expect(isLedgerRouteAllowed('GET', ['accounts', 'ACME-1/../../admin', 'balance'])).toBe(false);
  });

  it('refuses a {param} segment carrying a backslash', () => {
    expect(isLedgerRouteAllowed('GET', ['accounts', '..\\..\\admin', 'balance'])).toBe(false);
  });

  it('still allows an ordinary {param} value with none of those characters', () => {
    expect(isLedgerRouteAllowed('GET', ['accounts', 'ACME-000123', 'balance'])).toBe(true);
  });
});
