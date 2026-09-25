/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: A confirmed recording appears in the list
 *     Given the operator Mai has asked to record a credit of 250.00 SGD to ACME-000123
 *     When she confirms
 *     Then the list shows the new credit of 250.00 SGD on ACME-000123
 *
 * No reload, no other action between confirming and reading the list (§3 "before the operator
 * acts again"). RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account, confirmMovement, daysAgo, fillRecordForm, recordRows, rowCells } from '../support/records';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('A confirmed recording appears in the list', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
  await page.goto(`${baseURL}/records`);
  await expect(recordRows(page)).toHaveCount(0);
  await fillRecordForm(page, { accountNumber: 'ACME-000123', direction: 'Credit', amount: '250.00' });

  await confirmMovement(page);

  await expect(recordRows(page)).toHaveCount(1);
  // Everything but the posting number, which the service assigns.
  expect((await rowCells(recordRows(page).first())).slice(1)).toEqual(['ACME-000123', 'Credit', 'Transfer', '250.00', 'SGD', daysAgo(0), 'Posted']);
});
