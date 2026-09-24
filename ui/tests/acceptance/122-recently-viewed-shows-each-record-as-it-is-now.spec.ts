/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: Recently viewed shows each record as it is now
 *     Given Mai opened ACME-000123 while it was named "Acme Operating"
 *     And it has since been renamed "Acme Treasury"
 *     When she opens the Overview screen
 *     Then her recently viewed entry reads ACME-000123 "Acme Treasury"
 *
 * The browser keeps the record's identifier and nothing about it (§3a, R5): no name, number or
 * amount is in its storage — the identifier is. RED today: no screen keeps what was opened.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { openAccount, panel } from '../support/overview';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

test('Recently viewed shows each record as it is now', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme Operating', balance: '4321.00', availableBalance: '4321.00' })]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await openAccount(page, baseURL!, 'ACME-000123');
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme Treasury', balance: '4321.00', availableBalance: '4321.00' })]);

  await page.goto(`${baseURL}/`);

  const entry = panel(page, 'Recently viewed').getByRole('listitem');
  await expect(entry).toHaveCount(1);
  await expect(entry).toContainText('ACME-000123');
  await expect(entry).toContainText('Acme Treasury');
  await expect(entry).not.toContainText('Acme Operating');

  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(stored).toContain(ACME_ID);
  expect(stored).not.toContain('ACME-000123');
  expect(stored).not.toContain('Acme');
  expect(stored).not.toContain('4321');
});
