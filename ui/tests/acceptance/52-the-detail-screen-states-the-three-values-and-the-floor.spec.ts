/**
 * DRK-1696 §5:
 *   Scenario: The detail screen states the three values and the floor
 *     Given the account ACME-000123 holds 12,400.00 SGD with 400.00 SGD held
 *     And that account is permitted to go negative up to 5,000.00 SGD
 *     When the operator Mai opens its detail screen
 *     Then she sees balance, available balance and held amount as three separate values
 *     And she sees the floor stated as -5,000.00 SGD as the service states it
 *
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('The detail screen states the three values and the floor', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    {
      accountNumber: 'ACME-000123',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '12400.00',
      availableBalance: '12000.00',
      heldAmount: '400.00',
      permittedToGoNegative: true,
      overdraftLimit: '5000.00',
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);

  await expect(page.getByTestId('account-balance')).toContainText('12,400.00');
  await expect(page.getByTestId('account-available-balance')).toContainText('12,000.00');
  await expect(page.getByTestId('account-held-amount')).toContainText('400.00');
  await expect(page.getByTestId('account-floor')).toContainText('−5,000.00 SGD');
});
