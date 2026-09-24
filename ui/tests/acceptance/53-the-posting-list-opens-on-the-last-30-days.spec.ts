/**
 * DRK-1696 §5:
 *   Scenario: The posting list opens on the last 30 days
 *     Given the operator Mai opens the detail screen of the account ACME-000123
 *     When the postings load
 *     Then the period is the last 30 days
 *
 * Decision log: "the detail screen's posting list opens on the last 30 days, because the
 * service requires a period and refuses one wider than 90 days." RED today: no
 * `/accounts/{account}` route exists yet.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('The posting list opens on the last 30 days', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await expect(page.getByTestId('postings-panel')).toBeVisible();

  const calls = (await ledgerRequests()).filter((r) => r.method === 'GET' && r.path.startsWith('/v1/postings?'));
  const last = calls.at(-1)!;
  const params = new URLSearchParams(last.path.split('?')[1]);
  const from = new Date(params.get('from')!);
  const to = new Date(params.get('to')!);
  const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  expect(spanDays).toBeGreaterThanOrEqual(29);
  expect(spanDays).toBeLessThanOrEqual(30);
});
