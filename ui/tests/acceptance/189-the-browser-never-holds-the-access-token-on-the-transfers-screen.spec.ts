/**
 * DRK-2325 §5:
 *   @integration Scenario: The browser never holds the access token on the Transfers screen
 *     When Mai lists, opens and records a transfer on the Transfers screen
 *     Then no answer the browser receives carries the access token
 *
 * Mirrors `07-browser-never-holds-access-token.spec.ts` and
 * `36-access-token-never-reaches-browser.spec.ts`: `accessTokenOverride` fixes the cached token's
 * literal, and every same-origin answer — body and headers — is searched for it, as are the page
 * and browser storage. The 3 transfer routes are checked to have reached the ledger, so the
 * search covers their answers rather than passing on a screen that never read or wrote.
 *
 * RED today: there is no `/transfers` page (brief §3 rows 6, 7) and the console forwards no
 * transfer route (row 1).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedCurrencies, seedLedgerAccounts, seedLedgerPostings, seedLedgerTransfers } from '../support/ledger';
import { signInAs } from '../support/sign-in';

const CANARY_LITERAL = 'MAI-CANARY-ACCESS-TOKEN-189-DO-NOT-EXPOSE';
// A token whose claims grant Mai the 3 scopes (`{"scp":"accounts.read postings.read postings.write"}`),
// so the console offers Record transfer; the canary literal is its last segment.
const CANARY_ACCESS_TOKEN = `eyJhbGciOiJub25lIn0.eyJzY3AiOiJhY2NvdW50cy5yZWFkIHBvc3RpbmdzLnJlYWQgcG9zdGluZ3Mud3JpdGUifQ.${CANARY_LITERAL}`;
/** Neither the whole token nor its canary literal may reach the browser. */
const SECRETS = [CANARY_ACCESS_TOKEN, CANARY_LITERAL];
const ALICE = 'a0000000-0000-4000-8000-000000000101';
const BOB_USD = 'a0000000-0000-4000-8000-000000000201';
const TRANSFER = 'c0000000-0000-4000-8000-000000000001';

test('The browser never holds the access token on the Transfers screen', async ({ page, context, baseURL }) => {
  await seedCurrencies([{ code: 'USD', name: 'US Dollar', decimalPlaces: 2 }]);
  const account = { currency: 'SGD', decimalPlaces: 2, balance: '1000.00', availableBalance: '1000.00', heldAmount: '0.00', permittedToGoNegative: false };
  await seedLedgerAccounts([
    { ...account, id: ALICE, accountNumber: 'ACME-000101', name: 'Alice SGD' },
    { ...account, id: BOB_USD, accountNumber: 'ACME-000201', name: 'Bob USD', currency: 'USD' },
  ]);
  await seedLedgerPostings([
    { id: 'b0000000-0000-4000-8000-000000000101', postingNumber: 'PST-0000000101', accountId: ALICE, streamPosition: 1, direction: 'Debit', amount: '100.00', signedAmount: '-100.00', balanceAfter: '900.00', currency: 'SGD', category: 'Transfer' },
    { id: 'b0000000-0000-4000-8000-000000000102', postingNumber: 'PST-0000000102', accountId: BOB_USD, streamPosition: 1, direction: 'Credit', amount: '74.00', signedAmount: '74.00', balanceAfter: '1074.00', currency: 'USD', category: 'Transfer' },
  ]);
  await seedLedgerTransfers([
    {
      id: TRANSFER,
      sourceAccountId: ALICE,
      destinationAccountId: BOB_USD,
      amount: '100.00',
      sourceCurrency: 'SGD',
      destinationCurrency: 'USD',
      exchangeRate: '0.74',
      fee: '0.00',
      feeAccountId: null,
      convertedAmount: '74.00',
      recordedAt: new Date().toISOString(),
      callingSystem: 'PayHub',
      idempotencyKey: 'payroll-oct-001',
      postingIds: ['b0000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000102'],
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email, accessTokenOverride: CANARY_ACCESS_TOKEN });

  const answers: Array<{ url: string; headers: Record<string, string>; body: Promise<string> }> = [];
  page.on('response', (response) => {
    if (!response.url().startsWith(baseURL!)) return;
    answers.push({ url: response.url(), headers: response.headers(), body: response.text().catch(() => '') });
  });

  // Lists Alice's transfers.
  await page.goto(`${baseURL}/transfers`);
  await page.getByRole('combobox', { name: 'Account' }).selectOption({ label: 'ACME-000101 — Alice SGD' });
  const row = page.getByRole('row').filter({ hasText: '100.00 SGD' });
  await expect(row).toHaveCount(1);

  // Opens the transfer.
  await row.click();
  const details = page.getByRole('complementary', { name: 'Details' });
  await expect(details).toContainText('payroll-oct-001');
  await expect(details).toContainText('PST-0000000102');
  await details.getByRole('button', { name: 'Close details' }).click();

  // Records a transfer.
  await page.getByRole('button', { name: 'Record transfer' }).click();
  const panel = page.getByRole('complementary', { name: 'Details' });
  await panel.getByLabel('Destination account', { exact: true }).selectOption({ label: 'ACME-000201 — Bob USD' });
  await panel.getByLabel('Amount', { exact: true }).fill('10.00');
  await panel.getByLabel('Rate', { exact: true }).fill('0.74');
  await panel.getByRole('button', { name: 'Review transfer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Record transfer' }).click();
  await expect(page.getByRole('status')).toContainText('Transfer recorded');

  // The 3 transfer routes reached the ledger, so their answers are among those searched.
  const reached = (await ledgerRequests()).map((request) => `${request.method} ${request.path.split('?')[0]}`);
  expect(reached).toContain(`GET /v1/accounts/${ALICE}/transfers`);
  expect(reached).toContain(`GET /v1/transfers/${TRANSFER}`);
  expect(reached).toContain('POST /v1/transfers');

  expect(answers.length).toBeGreaterThan(0);
  for (const answer of answers) {
    const body = await answer.body;
    for (const secret of SECRETS) {
      expect(body, answer.url).not.toContain(secret);
      for (const value of Object.values(answer.headers)) expect(value, answer.url).not.toContain(secret);
    }
  }
  const content = await page.content();
  for (const secret of SECRETS) expect(content).not.toContain(secret);
  const storage = await page.evaluate(() => JSON.stringify(window.localStorage) + JSON.stringify(window.sessionStorage));
  for (const secret of SECRETS) expect(storage).not.toContain(secret);
  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === 'sessionId');
  expect(sessionCookie?.httpOnly).toBe(true);
});
