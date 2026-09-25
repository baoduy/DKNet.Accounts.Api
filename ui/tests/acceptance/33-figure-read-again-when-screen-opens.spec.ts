/**
 * DRK-1679 §5:
 *   Scenario: A figure is read again when the screen showing it opens
 *     Given the operator Mai read the account ACME-000123 at 12,400.00 SGD and left that screen
 *     And a colleague has since recorded a credit of 500.00 SGD to that account
 *     When Mai opens that account's screen again
 *     Then she sees 12,900.00 SGD
 *
 * Proves row 7's `refetchOnMount: 'always'` for money-bearing queries. RED today: the
 * harness page 500s, so the first read never happens.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A figure is read again when the screen showing it opens', async ({ page, baseURL }) => {
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

  const firstVisit = await page.goto(`${baseURL}/ledger-harness-internal`);
  expect(firstVisit?.status()).toBe(200);
  await page.getByRole('row', { name: /ACME-000123/ }).click();
  await expect(page.getByTestId('detail-panel')).toContainText('12,400.00');

  // A colleague — not this operator's session — records the credit directly against the
  // fake ledger service, the way the real service would see any other console instance's write.
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

  await page.goto(`${baseURL}/`);
  await page.goto(`${baseURL}/ledger-harness-internal`);
  await page.getByRole('row', { name: /ACME-000123/ }).click();
  await expect(page.getByTestId('detail-panel')).toContainText('12,900.00');
});
