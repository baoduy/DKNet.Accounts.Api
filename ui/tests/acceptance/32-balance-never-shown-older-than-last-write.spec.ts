/**
 * DRK-1679 §5:
 *   Scenario: A balance is never shown from a copy older than the last write
 *     Given the operator Mai is reading the balances of the account ACME-000123
 *     When she records a credit of 500.00 SGD to that account
 *     Then the operator sees the balance including the 500.00 SGD
 *
 * Proves row 9's "invalidate on success" behaviour (DRK-1679 §9 Q2: invalidate-and-refetch,
 * never an optimistic number). RED today: the harness page 500s before any balance renders.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A balance is never shown from a copy older than the last write', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    {
      accountNumber: 'ACME-000123',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '12400.00',
      availableBalance: '12400.00',
      heldAmount: '0.00',
      permittedToGoNegative: true,
      overdraftLimit: '5000.00',
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const response = await page.goto(`${baseURL}/ledger-harness-internal`);
  expect(response?.status()).toBe(200);

  await page.getByRole('row', { name: /ACME-000123/ }).click();
  await expect(page.getByTestId('detail-panel')).toContainText('12,400.00');

  await page.getByRole('button', { name: 'Record posting' }).click();
  await page.getByLabel('Account').fill('ACME-000123');
  await page.getByLabel('Direction').selectOption('Credit');
  await page.getByLabel('Amount').fill('500.00');
  await page.getByLabel('Currency').fill('SGD');
  await page.getByLabel('Category').fill('Transfer');
  await page.getByRole('button', { name: 'Record' }).click();

  await expect(page.getByTestId('detail-panel')).toContainText('12,900.00');
});
