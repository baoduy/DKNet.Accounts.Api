/**
 * DRK-1696 §5:
 *   Scenario: An account is opened
 *     Given the ledger serves the group ACME and the currency SGD
 *     When the operator Mai opens an account named Operating account in ACME, in SGD, classified as a liability
 *     Then the account is opened at a zero balance
 *     And she chose its group and its currency from lists the service supplied
 *
 * RED today: no `/accounts` route, no `POST /v1/accounts` in the contract's allowlist.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccountGroups } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('An account is opened', async ({ page, baseURL }) => {
  await seedLedgerAccountGroups([{ id: 'group-acme', code: 'ACME', name: 'ACME', type: 'Customer' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts`);
  await page.getByRole('button', { name: 'Open account' }).click();

  await page.getByLabel('Name').fill('Operating account');
  await page.getByLabel('Group').selectOption({ label: 'ACME' });
  await page.getByLabel('Currency').selectOption('SGD');
  await page.getByLabel('Accounting classification').selectOption('Liability');
  await page.getByLabel('Permitted to go negative').uncheck();
  await page.getByRole('button', { name: 'Open' }).click();

  await expect(page.getByText('Operating account')).toBeVisible();
  await expect(page.getByText('0.00 SGD')).toBeVisible();

  const groupOptions = await page.getByLabel('Group').locator('option').allTextContents();
  expect(groupOptions).toContain('ACME');
  const currencyOptions = await page.getByLabel('Currency').locator('option').allTextContents();
  expect(currencyOptions).toContain('SGD');
});
