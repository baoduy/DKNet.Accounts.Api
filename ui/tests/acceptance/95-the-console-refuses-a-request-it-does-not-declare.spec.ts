/**
 * DRK-1695 §5:
 *   Scenario Outline: The console refuses a request it does not declare
 *     Given Mai is signed in to the console
 *     When her browser asks the console for <request>
 *     Then the browser gets a refusal naming the route it asked for
 *     And the answer carries no data from the service
 *
 *     Examples:
 *       | request                                                   |
 *       | a route the console declares no operation for             |
 *       | a group whose identifier carries its own path separator   |
 *
 * §3 row 6 (KEEP): the separator guard and the allowlist derivation
 * (`isLedgerRouteAllowed`, `app/api/ledger/[...route]/route.ts:29`) are unchanged by this
 * slice's contract widening (rows 1-2, 4-5) — this is the regression proof that widening the
 * allowlist to the 13 new account-group/currency routes does not also widen what a `{param}`
 * segment accepts. Both examples below already pass today: they exercise an existing,
 * invariant mechanism in the new routes' context, not new behaviour this slice adds. See the
 * completion report's per-scenario table for why this is expected, not a smell.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('The console refuses an account-groups route it declares no operation for', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  // PATCH is not declared for `/account-groups/{id}` — only GET, PUT and DELETE are (§3a).
  const response = await page.request.fetch(`${baseURL}/api/ledger/account-groups/11111111-1111-4111-8111-111111111111`, {
    method: 'PATCH',
    data: {},
  });

  expect(response.status()).toBe(404);
  const body = await response.json();
  expect(body.errors[0].message).toContain('not declare');

  const calls = (await ledgerRequests()).filter((r) => r.method === 'PATCH' && r.path.includes('account-groups'));
  expect(calls.length).toBe(0);
});

test('The console refuses a group identifier that carries its own path separator', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const response = await page.request.get(`${baseURL}/api/ledger/account-groups/..%2F..%2Fadmin/balances`);

  expect(response.status()).toBe(404);
  const body = await response.json();
  expect(body.errors[0].message).toContain('not declare');

  const calls = (await ledgerRequests()).filter((r) => r.path.includes('admin'));
  expect(calls.length).toBe(0);
});
