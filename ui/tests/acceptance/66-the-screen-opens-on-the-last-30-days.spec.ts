/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: The screen opens on the last 30 days
 *     Given the ledger holds a posting effective 10 days ago and a posting effective 45 days ago
 *     When the operator Mai opens the Records screen
 *     Then the period is the last 30 days
 *     And she sees only the posting effective 10 days ago
 *
 * RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, account, daysAgo, posting, recordRow, recordRows } from '../support/records';
import { signInAs } from '../support/sign-in';

test('The screen opens on the last 30 days', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await seedLedgerPostings([
    posting({ id: 'b0000000-0000-4000-8000-000000010010', postingNumber: 'P-10010', accountId: ACME_ID, direction: 'Credit', amount: '10.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(10) }),
    posting({ id: 'b0000000-0000-4000-8000-000000010045', postingNumber: 'P-10045', accountId: ACME_ID, direction: 'Credit', amount: '45.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(45) }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/records`);

  await expect(page.getByLabel('From', { exact: true })).toHaveValue(daysAgo(30));
  await expect(page.getByLabel('To', { exact: true })).toHaveValue(daysAgo(0));
  await expect(recordRow(page, 'P-10010')).toHaveCount(1);
  await expect(recordRows(page)).toHaveCount(1);
  await expect(recordRow(page, 'P-10045')).toHaveCount(0);
});
