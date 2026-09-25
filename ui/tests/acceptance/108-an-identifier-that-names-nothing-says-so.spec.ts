/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: An identifier that names nothing says so
 *     Given no account, group or posting has the id 0b7f1a2c-3d4e-4f5a-8b6c-7d8e9f0a1b2c
 *     When Mai searches for "0b7f1a2c-3d4e-4f5a-8b6c-7d8e9f0a1b2c"
 *     Then she reads that no account, group or posting carries that identifier
 *
 * Mai reads postings, so all 3 lookups are made. RED today: the Overview search does not exist.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests } from '../support/ledger';
import { searchFor, searchResults } from '../support/overview';
import { signInAs } from '../support/sign-in';

const UNKNOWN_ID = '0b7f1a2c-3d4e-4f5a-8b6c-7d8e9f0a1b2c';

test('An identifier that names nothing says so', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/`);

  await searchFor(page, UNKNOWN_ID);

  await expect(searchResults(page).getByText('No account, group or posting carries this identifier.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${baseURL}/`);
  const lookups = (await ledgerRequests()).filter((r) => r.method === 'GET').map((r) => r.path);
  expect(lookups).toEqual(expect.arrayContaining([`/v1/accounts/${UNKNOWN_ID}`, `/v1/account-groups/${UNKNOWN_ID}`, `/v1/postings/${UNKNOWN_ID}`]));
});
