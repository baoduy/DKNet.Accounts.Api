/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: A row states the whole movement
 *     Given P-10042 is a credit of 100.00 SGD on ACME-000123, category Transfer, effective 2026-09-21 and not reversed
 *     When the operator Mai opens the Records screen
 *     Then the row of P-10042 shows P-10042, ACME-000123, Credit, Transfer, 100.00 SGD, 2026-09-21 and Posted
 *
 * The period is set to September 2026 after opening, so the fixed 2026-09-21 stays inside the
 * list on any run date (the default period is scenario 66's). RED today: no `/records` route.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, account, posting, recordRow, rowCells, setPeriod } from '../support/records';
import { signInAs } from '../support/sign-in';

test('A row states the whole movement', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await seedLedgerPostings([
    posting({ id: 'b0000000-0000-4000-8000-000000010042', postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Credit', amount: '100.00', currency: 'SGD', category: 'Transfer', effectiveDate: '2026-09-21', status: 'Posted' }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/records`);
  await setPeriod(page, '2026-09-01', '2026-09-30');

  const row = recordRow(page, 'P-10042');
  await expect(row).toHaveCount(1);
  expect(await rowCells(row)).toEqual(['P-10042', 'ACME-000123', 'Credit', 'Transfer', '100.00', 'SGD', '2026-09-21', 'Posted']);
});
