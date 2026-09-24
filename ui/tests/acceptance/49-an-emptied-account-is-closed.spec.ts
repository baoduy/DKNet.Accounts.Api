/**
 * DRK-1696 §5:
 *   Scenario: An emptied account is closed
 *     Given the account ACME-000123 holds 0.00 SGD with 0.00 held
 *     When the operator Mai closes it
 *     Then the account is closed
 *     And the same control now offers to reopen it
 *
 * RED today: no `/accounts/{account}` route, no `PATCH` in the pass-through's allowlist.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('An emptied account is closed', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '0.00', availableBalance: '0.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  const control = page.getByRole('button', { name: /close/i });
  await expect(control).toBeEnabled();
  await control.click();

  await expect(page.getByText('Closed')).toBeVisible();
  await expect(page.getByRole('button', { name: /reopen/i })).toBeVisible();
});
