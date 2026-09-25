/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: An operator who cannot read postings is told the lookup was partial
 *     Given the operator Nam may read accounts but not postings
 *     And no account or group has the id 51b0c3d2-7e8f-4a9b-8c1d-2e3f4a5b6c7d
 *     When Nam searches for "51b0c3d2-7e8f-4a9b-8c1d-2e3f4a5b6c7d"
 *     Then he reads that postings were not looked up, and that this needs the postings read permission
 *
 * The posting P-10042 does carry that id: the stand-in ledger answers every caller, so only a
 * console that skips the posting lookup for Nam can show the partial statement rather than
 * open it. RED today: the Overview search does not exist.
 */
import { expect, test } from '../support/test';
import { NAM } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { searchFor, searchResults } from '../support/overview';
import { ACME_ID, account, posting } from '../support/records';
import { signInAs } from '../support/sign-in';

const P_10042_ID = '51b0c3d2-7e8f-4a9b-8c1d-2e3f4a5b6c7d';

test('An operator who cannot read postings is told the lookup was partial', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await seedLedgerPostings([
    posting({ id: P_10042_ID, postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Credit', amount: '25.00', currency: 'SGD', category: 'Transfer' }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: NAM.email });
  await page.goto(`${baseURL}/`);

  await searchFor(page, P_10042_ID);

  const results = searchResults(page);
  await expect(results.getByText('Postings were not looked up.', { exact: true })).toBeVisible();
  await expect(results.getByText('requires postings.read', { exact: true })).toBeVisible();
  const paths = (await ledgerRequests()).map((r) => r.path);
  expect(paths).toContain(`/v1/accounts/${P_10042_ID}`);
  expect(paths).toContain(`/v1/account-groups/${P_10042_ID}`);
  expect(paths).not.toContain(`/v1/postings/${P_10042_ID}`);
});
