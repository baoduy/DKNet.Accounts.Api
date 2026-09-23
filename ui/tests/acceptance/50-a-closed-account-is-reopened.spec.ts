/**
 * DRK-1696 §5:
 *   Scenario: A closed account is reopened
 *     Given the account ACME-000123 is closed
 *     When the operator Mai reopens it
 *     Then the account is active
 *
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '@playwright/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A closed account is reopened', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    {
      accountNumber: 'ACME-000123',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '0.00',
      availableBalance: '0.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
      status: 'Closed',
      closedOn: new Date().toISOString(),
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByRole('button', { name: /reopen/i }).click();

  await expect(page.getByText('Active')).toBeVisible();
});
