/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: A backdated posting counts in the week it took effect
 *     Given today is 2026-09-24
 *     And the only posting was recorded on 2026-09-20 with an effective date of 2026-09-15
 *     When the operator Mai opens the Overview screen
 *     Then the week from 2026-09-11 to 2026-09-17 shows 1 and the latest week shows 0
 *
 * RED today: `/` draws no postings chart.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts, seedLedgerPostings, setLedgerClock } from '../support/ledger';
import { panel, tableCell } from '../support/overview';
import { ACME_ID, account, posting } from '../support/records';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('A backdated posting counts in the week it took effect', async ({ page, baseURL }) => {
  await setLedgerClock('2026-09-24');
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await seedLedgerPostings([
    posting({ id: 'b3000000-0000-4000-8000-000000000001', postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Credit', amount: '25.00', currency: 'SGD', category: 'Adjustment', effectiveDate: '2026-09-15', recordedAt: '2026-09-20T09:00:00.000Z' }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.clock.setFixedTime(new Date('2026-09-24T10:00:00Z'));

  await page.goto(`${baseURL}/`);

  const chart = panel(page, 'Postings per week');
  expect(await tableCell(chart, '2026-09-11 to 2026-09-17', null)).toBe('1');
  expect(await tableCell(chart, '2026-09-18 to 2026-09-24', null)).toBe('0');
});
