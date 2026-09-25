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
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('A posting is recorded against the account on screen', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '12400.00', availableBalance: '12400.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByRole('button', { name: 'Record posting' }).click();

  await expect(page.getByLabel('Account', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Account', { exact: true })).toHaveValue('ACME-000123');
  await expect(page.getByLabel('Currency', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Currency', { exact: true })).toHaveValue('SGD');

  await page.getByLabel('Direction', { exact: true }).selectOption('Credit');
  await page.getByLabel('Amount', { exact: true }).fill('500.00');
  await page.getByLabel('Category', { exact: true }).selectOption('Transfer');
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  // DRK-1713 §3 row 10 — recording is confirmed before anything is sent.
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();

  await expect
    .poll(async () => (await ledgerRequests()).filter((r) => r.method === 'POST' && r.path === '/v1/postings'))
    .toHaveLength(1);
  const calls = (await ledgerRequests()).filter((r) => r.method === 'POST' && r.path === '/v1/postings');
  const body = calls[0] as unknown as { body: { accountId: string; currency: string } };
  expect(body.body.accountId).toBe('ACME-000123');
  expect(body.body.currency).toBe('SGD');

  // The console reads the account again after a recording; let those reads land before the
  // next check resets the ledger, so none reaches the ledger after it.
  await page.waitForLoadState('networkidle');
});
