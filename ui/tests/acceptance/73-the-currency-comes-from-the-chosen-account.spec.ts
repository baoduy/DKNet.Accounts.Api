/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: The currency comes from the chosen account
 *     Given the account ACME-000123 holds SGD
 *     When the operator Mai chooses ACME-000123 on the Records screen's record form
 *     Then the currency shows SGD and cannot be changed
 *
 * The currency is empty until an account is chosen, so a form defaulting to SGD cannot pass.
 * RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

test('The currency comes from the chosen account', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { currency: 'SGD' })]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
  await page.goto(`${baseURL}/records`);

  await page.getByRole('button', { name: 'Record posting', exact: true }).click();
  await expect(page.getByLabel('Posting currency', { exact: true })).toHaveValue('');
  await page.getByLabel('Account', { exact: true }).fill('ACME-000123');
  await page.getByRole('option', { name: /^ACME-000123\b/ }).click();

  await expect(page.getByLabel('Posting currency', { exact: true })).toHaveValue('SGD');
  await expect(page.getByLabel('Posting currency', { exact: true })).toBeDisabled();
});
