/**
 * DRK-1696 §5:
 *   Scenario: A refused posting is shown with the service's own code
 *     Given the account ACME-000123 holds 12,400.00 SGD with a floor of 0.00 SGD
 *     When the operator Mai records a debit of 20,000.00 SGD
 *     Then she sees the code INSUFFICIENT_FUNDS with the service's own wording
 *     And the balance on screen is still 12,400.00 SGD
 *
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme("A refused posting is shown with the service's own code", async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '12400.00', availableBalance: '12400.00', heldAmount: '0.00', permittedToGoNegative: false, minimumBalance: '0.00' },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByRole('button', { name: 'Record posting' }).click();
  await page.getByLabel('Direction', { exact: true }).selectOption('Debit');
  await page.getByLabel('Amount', { exact: true }).fill('20000.00');
  await page.getByLabel('Category', { exact: true }).selectOption('Transfer');
  await page.getByRole('button', { name: 'Record' }).click();
  // DRK-1713 §3 row 10 — recording is confirmed before anything is sent.
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();

  await expect(page.getByText('INSUFFICIENT_FUNDS')).toBeVisible();
  await expect(page.getByText('The debit would take the account past its floor.')).toBeVisible();
  await expect(page.getByTestId('account-balance')).toContainText('12,400.00');
});
