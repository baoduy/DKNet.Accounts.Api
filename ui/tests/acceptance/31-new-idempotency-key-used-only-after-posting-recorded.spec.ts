/**
 * DRK-1679 §5:
 *   Scenario: A new key is used only after a posting is recorded
 *     Given the operator Mai has recorded a posting successfully
 *     When she opens the record posting form again
 *     Then the new attempt carries a different idempotency key
 *
 * `useIdempotencyKey` (`components/forms/use-idempotency-key.ts`) already regenerates on
 * demand and is unit-tested; what is new here is the write hook (row 9, `useRecordPosting`)
 * calling `regenerate()` only when the service actually recorded the posting. The hook is a
 * stub — the harness page 500s before a form ever renders, so this is RED on the first
 * assertion (the success step itself is unreachable).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A new key is used only after a posting is recorded', async ({ page, baseURL }) => {
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

  const firstKey = await page.getByTestId('idempotency-key').textContent();
  await page.getByRole('button', { name: 'Record posting' }).click();
  await page.getByLabel('Account').fill('ACME-000123');
  await page.getByLabel('Direction').selectOption('Credit');
  await page.getByLabel('Amount').fill('10.00');
  await page.getByLabel('Currency').fill('SGD');
  await page.getByLabel('Category').fill('Transfer');
  await page.getByRole('button', { name: 'Record' }).click();
  await expect(page.getByText(/recorded/i)).toBeVisible();

  await page.getByRole('button', { name: 'Record posting' }).click();
  const secondKey = await page.getByTestId('idempotency-key').textContent();
  expect(secondKey).not.toBe(firstKey);
});
