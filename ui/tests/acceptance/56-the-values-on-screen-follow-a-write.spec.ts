/**
 * DRK-1696 §5:
 *   Scenario: The values on screen follow a write
 *     Given the operator Mai has the detail screen of the account ACME-000123 open at 12,400.00 SGD
 *     When she records a credit of 500.00 SGD
 *     Then she sees 12,900.00 SGD before she can record another
 *
 * "Before she can act again" — an ordering assertion, not just an eventual refresh: the
 * record control must be usable again only once the refreshed balance is on screen.
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '@playwright/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('The values on screen follow a write', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '12400.00', availableBalance: '12400.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByRole('button', { name: 'Record posting' }).click();
  await page.getByLabel('Direction').selectOption('Credit');
  await page.getByLabel('Amount').fill('500.00');
  await page.getByLabel('Category').selectOption('Transfer');
  await page.getByRole('button', { name: 'Record' }).click();

  await expect(page.getByTestId('account-balance')).toContainText('12,900.00');
  await expect(page.getByRole('button', { name: 'Record posting' })).toBeEnabled();
});
