/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: A reversal needs a reason and keeps both postings
 *     Given the posting P-10042 is a credit of 30.00 SGD on GLOBEX-000456
 *     When the operator Mai reverses P-10042 with the reason "duplicate of the morning batch" and confirms
 *     Then the list shows a new debit of 30.00 SGD on GLOBEX-000456 carrying that reason
 *     And the list shows P-10042 marked reversed
 *
 * The table has no description column (§3 "Each row must show ..."), so "carrying that
 * reason" is read from the new debit's own details. RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { ledgerPostings, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { GLOBEX_ID, account, cellText, confirmMovement, daysAgo, posting, recordRow, recordRows, rowCells } from '../support/records';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('A reversal needs a reason and keeps both postings', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('GLOBEX-000456', GLOBEX_ID)]);
  await seedLedgerPostings([
    posting({ id: 'b0000000-0000-4000-8000-000000010042', postingNumber: 'P-10042', accountId: GLOBEX_ID, direction: 'Credit', amount: '30.00', currency: 'SGD', category: 'Transfer', effectiveDate: daysAgo(1) }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
  await page.goto(`${baseURL}/records`);

  await recordRow(page, 'P-10042').click();
  await page.getByTestId('detail-panel').getByRole('button', { name: 'Reverse', exact: true }).click();
  await page.getByLabel('Reason', { exact: true }).fill('duplicate of the morning batch');
  await confirmMovement(page);

  await expect(recordRows(page)).toHaveCount(2);
  const debit = recordRows(page).filter({ hasNot: page.getByRole('cell', { name: 'P-10042', exact: true }) });
  expect((await rowCells(debit)).slice(1, 6)).toEqual(['GLOBEX-000456', 'Debit', 'Reversal', '30.00', 'SGD']);
  await expect.poll(async () => cellText(page, recordRow(page, 'P-10042'), 'Status')).toBe('Reversed');

  await debit.click();
  await expect(page.getByTestId('detail-panel')).toContainText('duplicate of the morning batch');

  // Both stay on the account: nothing was edited away.
  const held = await ledgerPostings();
  expect(held).toHaveLength(2);
  expect(held.every((p) => p.accountId === GLOBEX_ID)).toBe(true);
});
