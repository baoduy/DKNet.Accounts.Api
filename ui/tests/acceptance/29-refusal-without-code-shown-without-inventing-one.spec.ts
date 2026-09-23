/**
 * DRK-1679 §5:
 *   Scenario: A refusal without a code is shown without inventing one
 *     Given the operator Mai searches the postings list for the term "a"
 *     When the service refuses the search with wording and no code
 *     Then the operator sees the service's wording and the trace reference
 *     And the operator sees no refusal code
 *
 * `fake-ledger-service.ts` refuses a one-character `search` with a `400` carrying wording
 * and a `traceId` and no `code` (README.md "Refusals and error codes": a malformed-request
 * `400` never carries a business `code`). The pass-through (row 5) must return that answer
 * unchanged — RED today because it is a stub that always throws.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test('A refusal without a code is shown without inventing one', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const response = await page.request.get(`${baseURL}/api/ledger/postings?search=a`);

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.errors[0].message).toBe('Search term must be at least 2 characters.');
  expect(body.traceId).toBeTruthy();
  expect(body.errors[0].code).toBeUndefined();
});
