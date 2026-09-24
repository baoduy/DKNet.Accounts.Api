/**
 * DRK-1696 §5:
 *   Scenario: An operator finds an account and reads its balance
 *     Given the account ACME-000123 holds 12,400.00 SGD
 *     When the operator Mai opens the accounts screen and searches for ACME-000123
 *     Then she sees that account in the list with 12,400.00 SGD
 *
 * RED today: no `/accounts` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('An operator finds an account and reads its balance', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '12400.00', availableBalance: '12400.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/accounts`);
  await page.getByLabel('Search accounts').fill('ACME-000123');

  const row = page.getByRole('row', { name: /ACME-000123/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText('12,400.00');
});
