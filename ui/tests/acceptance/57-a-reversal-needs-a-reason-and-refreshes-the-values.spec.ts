/**
 * DRK-1696 §5:
 *   Scenario: A reversal needs a reason and refreshes the values
 *     Given the operator Mai is reading a posting of 500.00 SGD on the account ACME-000123
 *     When she reverses it with the reason "duplicate of the morning batch"
 *     Then the reversal is recorded with that reason
 *     And she sees the balance without the 500.00 SGD
 *
 * RED today: no `/accounts/{account}` route, no `POST /v1/postings/{id}/reverse` in the
 * pass-through's allowlist for a non-balance-route caller.
 */
import { expect, test } from '@playwright/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A reversal needs a reason and refreshes the values', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '12900.00', availableBalance: '12900.00', heldAmount: '0.00', permittedToGoNegative: false },
  ]);
  await seedLedgerPostings([
    { id: 'p1', postingNumber: 'PST0000000001', accountId: 'ACME-000123', streamPosition: 1, direction: 'Credit', amount: '500.00', signedAmount: '500.00', balanceAfter: '12900.00', currency: 'SGD', category: 'Transfer' },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

  await page.goto(`${baseURL}/accounts/ACME-000123`);
  await page.getByTestId('postings-panel').getByText('PST0000000001').click();
  await page.getByRole('button', { name: /reverse/i }).click();
  await page.getByLabel('Reason').fill('duplicate of the morning batch');
  await page.getByRole('button', { name: 'Confirm' }).click();

  await expect
    .poll(async () => (await ledgerRequests()).filter((r) => r.method === 'POST' && r.path.includes('/reverse')))
    .toHaveLength(1);
  const calls = (await ledgerRequests()).filter((r) => r.method === 'POST' && r.path.includes('/reverse'));
  const body = calls[0] as unknown as { body: { reason: string } };
  expect(body.body.reason).toBe('duplicate of the morning batch');

  await expect(page.getByTestId('account-balance')).toContainText('12,400.00');
});
