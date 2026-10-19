/**
 * DRK-2325 §5:
 *   @unit Scenario Outline: The console forwards only the routes on its list
 *     When a request to <route> reaches the console's forwarding route
 *     Then the console <result>
 *
 * The forwarding route (`app/api/ledger/[...route]/route.ts`) forwards a request only when
 * `isLedgerRouteAllowed` says its route is on the list, and refuses it with 404 before any call
 * otherwise — so the list decides each row (the `routes.test.ts` pattern).
 *
 * RED today on the 3 "forwards" rows: `contract/openapi.json` declares no transfer path
 * (brief §3 row 1). The "delete a transfer" row is @existing: refused today, refused after.
 */
import { describe, expect, it } from 'vitest';
import { allowedLedgerRoutes, isLedgerRouteAllowed } from './routes';

const TRANSFER_ID = 'c0000000-0000-4000-8000-000000000001';
const ALICE_ID = 'a0000000-0000-4000-8000-000000000101';

describe("The console forwards only the routes on its list", () => {
  it('record a transfer: POST /transfers forwards it to the ledger', () => {
    expect(allowedLedgerRoutes()).toContainEqual({ method: 'POST', pathTemplate: '/transfers' });
    expect(isLedgerRouteAllowed('POST', ['transfers'])).toBe(true);
  });

  it('read one transfer: GET /transfers/{id} forwards it to the ledger', () => {
    expect(allowedLedgerRoutes()).toContainEqual({ method: 'GET', pathTemplate: '/transfers/{id}' });
    expect(isLedgerRouteAllowed('GET', ['transfers', TRANSFER_ID])).toBe(true);
  });

  it("list one account's transfers: GET /accounts/{id}/transfers forwards it to the ledger", () => {
    expect(allowedLedgerRoutes()).toContainEqual({ method: 'GET', pathTemplate: '/accounts/{id}/transfers' });
    expect(isLedgerRouteAllowed('GET', ['accounts', ALICE_ID, 'transfers'])).toBe(true);
  });

  it('delete a transfer: DELETE /transfers/{id} is refused without forwarding', () => {
    expect(isLedgerRouteAllowed('DELETE', ['transfers', TRANSFER_ID])).toBe(false);
  });
});
