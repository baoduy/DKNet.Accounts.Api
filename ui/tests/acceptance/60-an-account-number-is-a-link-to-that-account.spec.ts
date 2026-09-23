/**
 * DRK-1696 §5:
 *   Scenario: An account number is a link to that account
 *     Given the operator Mai is reading the accounts list
 *     When she chooses the account number ACME-000123
 *     Then she reaches the detail screen of that account
 *
 * RED today: no `/accounts` route exists yet.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('An account number is a link to that account', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/accounts`);
  await page.getByRole('link', { name: 'ACME-000123' }).click();

  await expect(page).toHaveURL(`${baseURL}/accounts/ACME-000123`);
  await expect(page.getByTestId('account-balance')).toBeVisible();
});
