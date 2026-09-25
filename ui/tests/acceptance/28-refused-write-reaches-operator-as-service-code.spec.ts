/**
 * DRK-1679 §5:
 *   Scenario: A refused write reaches the operator as the service's own code
 *     Given the account ACME-000123 holds 12,400.00 SGD with a floor of 0.00 SGD
 *     When the operator Mai records a debit of 20,000.00 SGD
 *     Then the operator sees the refusal where the form is
 *     And the operator sees the code INSUFFICIENT_FUNDS with the service's own wording
 *
 * Driven at the console's own `/api/ledger/*` boundary (DRK-1684 §3 row 5): the endpoint
 * must return the ledger service's answer — status and `errors[].code` — unchanged. Not
 * implemented yet (row 5 is a stub that always throws), so this is RED on the first
 * assertion.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test("A refused write reaches the operator as the service's own code", async ({ page, baseURL }) => {
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

  const response = await page.request.post(`${baseURL}/api/ledger/postings`, {
    headers: { 'Idempotency-Key': 'test-28-debit' },
    data: { accountId: 'ACME-000123', direction: 'Debit', amount: '20000.00', currency: 'SGD', category: 'Transfer' },
  });

  // The refusal reaches the operator with the service's own code and wording — unchanged.
  expect(response.status()).toBe(422);
  const body = await response.json();
  expect(body.errors[0].code).toBe('INSUFFICIENT_FUNDS');
  expect(body.errors[0].message).toBe('The debit would take the account past its floor.');
});
