/**
 * DRK-1679 §5:
 *   Scenario: A list and the panel opened over it show the same balance
 *     Given the operator Mai has the accounts list open showing ACME-000123 at 12,400.00 SGD
 *     When she opens the detail panel over that account
 *     Then the panel shows 12,400.00 SGD
 *     And the console did not read that account a second time
 *
 * Proves row 8's one-key-per-resource sharing: opening the panel must not issue a second
 * `GET .../balance` to the ledger service. RED today: the harness page 500s before any read
 * happens at all.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A list and the panel opened over it show the same balance', async ({ page, baseURL }) => {
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
  await expect(page.getByRole('row', { name: /ACME-000123/ })).toContainText('12,400.00');

  const requestsBeforePanel = (await ledgerRequests()).filter((r) => r.path.includes('ACME-000123'));
  await page.getByRole('row', { name: /ACME-000123/ }).click();
  await expect(page.getByTestId('detail-panel')).toContainText('12,400.00');
  const requestsAfterPanel = (await ledgerRequests()).filter((r) => r.path.includes('ACME-000123'));

  expect(requestsAfterPanel.length).toBe(requestsBeforePanel.length);
});
