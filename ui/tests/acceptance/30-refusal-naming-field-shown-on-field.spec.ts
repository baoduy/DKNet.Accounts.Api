/**
 * DRK-1679 §5:
 *   Scenario: A refusal naming a field is shown on that field
 *     Given the operator Mai records a posting with an effective date in the future
 *     When the service refuses it with the code EFFECTIVE_DATE_IN_FUTURE for the date
 *     Then the operator sees the refusal marked on the date field
 *
 * `fake-ledger-service.ts` refuses a future `effectiveDate` with `422 EFFECTIVE_DATE_IN_
 * FUTURE`, `field: "effectiveDate"` — the pass-through (row 5) must return it unchanged, and
 * `routeRefusal` (row 10) must route a field-carrying entry away from the block-level
 * `RefusalAlert`. Both are stubs — RED on the first assertion.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('A refusal naming a field is shown on that field', async ({ page, baseURL }) => {
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

  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const response = await page.request.post(`${baseURL}/api/ledger/postings`, {
    headers: { 'Idempotency-Key': 'test-30-future-date' },
    data: { accountId: 'ACME-000123', direction: 'Credit', amount: '10.00', currency: 'SGD', category: 'Transfer', effectiveDate: futureDate },
  });

  expect(response.status()).toBe(422);
  const body = await response.json();
  expect(body.errors[0].code).toBe('EFFECTIVE_DATE_IN_FUTURE');
  expect(body.errors[0].field).toBe('effectiveDate');

  // Once the pass-through and the harness form exist, the refusal must render beside the
  // date field, not in the block-level alert.
  await page.goto(`${baseURL}/ledger-harness-internal`);
  await expect(page.getByLabel('Effective date')).toHaveAttribute('aria-invalid', 'true');
});
