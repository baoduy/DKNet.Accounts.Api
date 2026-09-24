/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: Recently viewed lists the last 10 records opened, newest first
 *     Given the operator Mai opened 12 different records, the last one ACME-000123
 *     When she opens the Overview screen
 *     Then she sees the 10 records she opened most recently, ACME-000123 first
 *
 * The 12 records are 11 accounts and then ACME-000123, each opened on its detail screen. RED
 * today: no screen keeps what was opened and `/` draws no recently viewed panel.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { openAccount, panel } from '../support/overview';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

const EARLIER = Array.from({ length: 11 }, (_, i) => `SEEN-${String(i + 1).padStart(6, '0')}`);

test('Recently viewed lists the last 10 records opened, newest first', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    ...EARLIER.map((accountNumber, i) => account(accountNumber, `a7000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, { name: `Seen ${i + 1}` })),
    account('ACME-000123', ACME_ID, { name: 'Acme Operating' }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  for (const accountNumber of [...EARLIER, 'ACME-000123']) await openAccount(page, baseURL!, accountNumber);

  await page.goto(`${baseURL}/`);

  const entries = panel(page, 'Recently viewed').getByRole('listitem');
  await expect(entries).toHaveCount(10);
  // Newest first: ACME-000123, then SEEN-000011 back to SEEN-000003; SEEN-000001 and -000002 dropped off.
  const expected = ['ACME-000123', ...EARLIER.slice(2).reverse()];
  for (const [index, accountNumber] of expected.entries()) await expect(entries.nth(index)).toContainText(accountNumber);
  await expect(panel(page, 'Recently viewed')).not.toContainText('SEEN-000001');
  await expect(panel(page, 'Recently viewed')).not.toContainText('SEEN-000002');
});
