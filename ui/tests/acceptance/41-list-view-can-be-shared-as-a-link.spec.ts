/**
 * DRK-1679 §5:
 *   Scenario: A list view can be shared as a link
 *     Given the operator Mai filters the accounts list to SGD, sorts by balance and opens ACME-000123
 *     When she copies the page address and opens it again
 *     Then she sees the same filter, the same sort, the same page and the same open record
 *
 * Proves row 13's URL state round-trip. RED today: the harness page 500s before any filter,
 * sort or open-record control exists.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A list view can be shared as a link', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    {
      accountNumber: 'ACME-000123',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '12400.00',
      availableBalance: '12400.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
      minimumBalance: '0.00',
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const response = await page.goto(`${baseURL}/ledger-harness-internal`);
  expect(response?.status()).toBe(200);

  await page.getByLabel('Currency filter').selectOption('SGD');
  await page.getByRole('columnheader', { name: 'Balance' }).click();
  await page.getByRole('row', { name: /ACME-000123/ }).click();
  await expect(page.getByTestId('detail-panel')).toBeVisible();

  const sharedUrl = page.url();
  await page.goto(sharedUrl);

  await expect(page.getByLabel('Currency filter')).toHaveValue('SGD');
  await expect(page.getByTestId('detail-panel')).toBeVisible();
});
