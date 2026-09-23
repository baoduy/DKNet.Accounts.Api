/**
 * DRK-1679 §5:
 *   Scenario: The console refuses a route its contract does not declare
 *     Given the operator Mai is signed in
 *     When the browser asks the console for a service path outside the generated contract
 *     Then the console refuses it
 *     And the console makes no call to the ledger service
 *
 * `/v1/admin/shutdown` is not one of `contract/openapi.json`'s paths. Row 5 must refuse it,
 * by name, before any outbound call (row 4's allowlist) — not merely because the whole
 * endpoint throws today. RED on the status/body assertion, which a generic 500 does not
 * satisfy; the "no call reached the ledger service" assertion is expected to hold both today
 * and after Build (it never stops being true), so it alone would prove nothing.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('The console refuses a route its contract does not declare', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const response = await page.request.get(`${baseURL}/api/ledger/admin/shutdown`);

  expect(response.status()).toBe(404);
  const body = await response.json();
  expect(body.errors[0].message).toContain('not declare');

  const calls = (await ledgerRequests()).filter((r) => r.path.includes('admin'));
  expect(calls.length).toBe(0);
});
