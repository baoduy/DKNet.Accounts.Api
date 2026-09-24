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

  /**
   * DRK-1696 §5 rule R1 — the traversal rule proven on a surface the original finding never
   * touched: `PATCH /accounts/{id}`, which DRK-1696's own change set (row 2) is what widens
   * the pass-through's allowlist to declare. dev-leader AT review round 1: the first version
   * of this test repeated the exact `GET .../balance` case already at line 13, which the
   * pre-`d27fb448` guard already covers — no new binding. `contract/openapi.json` is DRK-1696
   * §4 do-not-touch (stage 2/3's to widen), so today `PATCH /accounts/{id}` refuses for "not
   * declared" regardless of the segment's content; once the contract gains that route this
   * same assertion becomes the traversal proof on the new surface, not a re-run of the old one.
   */
  it('refuses a percent-decoded traversal inside a PATCH /accounts/{id} segment — the surface DRK-1696 §3 row 2 newly declares', () => {
    expect(isLedgerRouteAllowed('PATCH', ['accounts', '../../admin'])).toBe(false);
  });
});
