/**
 * DRK-1696 §5:
 *   Scenario: A posting is recorded against the account on screen
 *     Given the operator Mai has the detail screen of the account ACME-000123 open at 12,400.00 SGD
 *     When she records a credit of 500.00 SGD
 *     Then the posting is recorded against ACME-000123 in SGD
 *     And she could not have chosen another account or another currency
 *
 * RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '@playwright/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A posting is recorded against the account on screen', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '12400.00', availableBalance: '12400.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByRole('button', { name: 'Record posting' }).click();

  await expect(page.getByLabel('Account')).toBeDisabled();
  await expect(page.getByLabel('Account')).toHaveValue('ACME-000123');
  await expect(page.getByLabel('Currency')).toBeDisabled();
  await expect(page.getByLabel('Currency')).toHaveValue('SGD');

  await page.getByLabel('Direction').selectOption('Credit');
  await page.getByLabel('Amount').fill('500.00');
  await page.getByLabel('Category').selectOption('Transfer');
  await page.getByRole('button', { name: 'Record' }).click();

  const calls = (await ledgerRequests()).filter((r) => r.method === 'POST' && r.path === '/v1/postings');
  expect(calls).toHaveLength(1);
  const body = calls[0] as unknown as { body: { accountId: string; currency: string } };
  expect(body.body.accountId).toBe('ACME-000123');
  expect(body.body.currency).toBe('SGD');
});
