/**
 * pr-reviewer finding 1 (DRK-1687, round 1) — `GET /api/ledger/accounts/..%2F..%2Fadmin/balance`
 * put a traversal inside the `{id}` segment of `/accounts/{id}/balance`. Next decodes the
 * catch-all segment before the handler ever sees it, so `matchesTemplate` accepted it
 * unconditionally and `new URL(apiBaseUrl + '/v1/' + route.join('/'))` resolved outside `/v1`
 * on the ledger service, with the operator's decrypted bearer token attached. Fails against
 * `d27fb448` (404 never returned, an outbound call is made); passes once the pass-through
 * refuses any segment carrying its own `/` or `\` before the allowlist and the outbound path
 * is built from the matched segments, re-encoded.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('The console refuses a traversal sitting inside a {param} segment', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const response = await page.request.get(`${baseURL}/api/ledger/accounts/..%2F..%2Fadmin/balance`);

  expect(response.status()).toBe(404);
  const body = await response.json();
  expect(body.errors[0].message).toContain('not declare');

  const calls = (await ledgerRequests()).filter((r) => r.path.includes('admin'));
  expect(calls.length).toBe(0);
});
