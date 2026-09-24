/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: The account on a row opens that account
 *     Given the list shows a posting on ACME-000123
 *     When the operator Mai follows ACME-000123 on that row
 *     Then she sees the detail screen of ACME-000123
 *
 * RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, account, daysAgo, posting, recordRow } from '../support/records';
import { signInAs } from '../support/sign-in';

test('The account on a row opens that account', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await seedLedgerPostings([
    posting({ id: 'b0000000-0000-4000-8000-000000010042', postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Credit', amount: '100.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(1) }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/records`);

  await recordRow(page, 'P-10042').getByRole('link', { name: 'ACME-000123', exact: true }).click();

  await expect(page).toHaveURL(`${baseURL}/accounts/ACME-000123`);
  await expect(page.getByTestId('account-balance')).toBeVisible();
});
