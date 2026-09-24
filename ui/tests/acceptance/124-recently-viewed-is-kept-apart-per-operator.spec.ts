/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: Recently viewed is kept apart per operator
 *     Given Mai opened ACME-000123 in this browser and signed out
 *     When Nam signs in in the same browser and opens the Overview screen
 *     Then his recently viewed list does not show ACME-000123
 *
 * The same browser context throughout: storage survives the sign-outs. Mai signing back in and
 * still finding ACME-000123 proves the list was kept apart, not thrown away. RED today: no
 * screen keeps what was opened, so Mai's own list is empty too.
 */
import { expect, test } from '../support/test';
import { MAI, NAM } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { openAccount, panel, signOut } from '../support/overview';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

test('Recently viewed is kept apart per operator', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme Operating' })]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await openAccount(page, baseURL!, 'ACME-000123');
  await signOut(page, baseURL!);

  await signInAs(page, { consoleBaseUrl: baseURL!, email: NAM.email });
  await page.goto(`${baseURL}/`);

  const recent = panel(page, 'Recently viewed');
  await expect(recent.getByText('Records you open will appear here.', { exact: true })).toBeVisible();
  await expect(recent).not.toContainText('ACME-000123');

  await signOut(page, baseURL!);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/`);
  await expect(recent.getByRole('listitem')).toHaveCount(1);
  await expect(recent.getByRole('listitem').first()).toContainText('ACME-000123');
});
