/**
 * DRK-1696 §5:
 *   Scenario: Closing an account that holds money is refused in plain sight
 *     Given the account ACME-000123 holds 12,400.00 SGD
 *     When the operator Mai opens that account
 *     Then she sees the close action on screen and disabled
 *     And she sees 12,400.00 SGD and the code ACCOUNT_HOLDS_BALANCE as the reason
 *
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('Closing an account that holds money is refused in plain sight', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '12400.00', availableBalance: '12400.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);

  const closeButton = page.getByRole('button', { name: /close/i });
  await expect(closeButton).toBeVisible();
  await expect(closeButton).toBeDisabled();
  await expect(page.getByText('12,400.00 SGD')).toBeVisible();
  await expect(page.getByText('ACCOUNT_HOLDS_BALANCE')).toBeVisible();
});
