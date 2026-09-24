/**
 * DRK-1696 §5:
 *   Scenario: Narrowing by currency uses the spelling the service accepts
 *     Given the ledger holds accounts in SGD and in JPY
 *     When the operator Mai narrows the accounts list to SGD
 *     Then the service accepts the request
 *     And she sees only the SGD accounts
 *
 * README.md's "On GET /v1/accounts, narrow by currency as CurrencyCode, not Currency" note:
 * the response body reads `currency`, but the query surface takes `CurrencyCode`. RED today:
 * no `/accounts` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('Narrowing by currency uses the spelling the service accepts', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000001', currency: 'SGD', decimalPlaces: 2, balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', permittedToGoNegative: false },
    { accountNumber: 'ACME-000002', currency: 'JPY', decimalPlaces: 0, balance: '5000', availableBalance: '5000', heldAmount: '0', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/accounts`);
  await page.getByLabel('Currency filter', { exact: true }).selectOption('SGD');

  await expect(page.getByRole('row', { name: /ACME-000001/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /ACME-000002/ })).not.toBeVisible();

  const calls = (await ledgerRequests()).filter((r) => r.method === 'GET' && r.path.startsWith('/v1/accounts?'));
  const last = calls.at(-1)!;
  expect(last.path).toContain('CurrencyCode');
  expect(last.path).not.toContain('filter=Currency:');
});
