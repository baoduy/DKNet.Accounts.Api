/**
 * DRK-1679 §5:
 *   Scenario: A figure is read again when the console comes back into focus
 *     Given the operator Mai has the account ACME-000123 open at 12,400.00 SGD
 *     And she moves to another tab, and a colleague records a credit of 500.00 SGD to that account
 *     When Mai brings the console back into focus
 *     Then she sees 12,900.00 SGD
 *
 * Proves row 7's `refetchOnWindowFocus: true` for money-bearing queries. RED today: the
 * harness page 500s, so the first read never happens.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A figure is read again when the console comes back into focus', async ({ page, context, baseURL }) => {
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

  // She moves to another tab.
  const otherTab = await context.newPage();
  await otherTab.goto('about:blank');

  await seedLedgerAccounts([
    {
      accountNumber: 'ACME-000123',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '12900.00',
      availableBalance: '12900.00',
      heldAmount: '0.00',
      permittedToGoNegative: true,
      overdraftLimit: '5000.00',
    },
  ]);

  // Brings the console back into focus.
  await page.bringToFront();
  await expect(page.getByTestId('detail-panel')).toContainText('12,900.00');
});
