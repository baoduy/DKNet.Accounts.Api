/**
 * DRK-1696 §5:
 *   Scenario: An address naming no account says so
 *     Given no account matches ACME-999999
 *     When the operator Mai opens the detail screen address for ACME-999999
 *     Then she is told that account was not found
 *     And she is shown no other account's balance
 *
 * Decision log: "The design system's fall-back to the first account would show one
 * account's money under another account's number" — this scenario exists to forbid that
 * fall-back. RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('An address naming no account says so', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000001', currency: 'SGD', decimalPlaces: 2, balance: '77.00', availableBalance: '77.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/accounts/ACME-999999`);

  await expect(page.getByText(/not found/i)).toBeVisible();
  await expect(page.getByTestId('account-balance')).not.toBeVisible();
  await expect(page.getByText('77.00')).not.toBeVisible();
});
