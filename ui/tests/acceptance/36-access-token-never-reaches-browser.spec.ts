/**
 * DRK-1679 §5:
 *   Scenario: The access token never reaches the browser
 *     Given the operator Mai is signed in
 *     When the console reads the account ACME-000123 on her behalf
 *     Then the browser sends its request to the console, not to the ledger service
 *     And no response the browser receives carries the access token
 *
 * Every browser-visible request in this suite already targets the console's own origin
 * (`/api/ledger/...`) — that much is structural. What is not yet true is that the read
 * actually succeeds and returns the service's answer with no token anywhere in it (R1). RED
 * today: row 5 is a stub that always throws before ever reading the cached token.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('The access token never reaches the browser', async ({ page, baseURL }) => {
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

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  // A real fetch from inside the browser page — not `page.request`, which never touches the
  // browser's own network stack — is what "the browser sends its request" actually means.
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/ledger/accounts/ACME-000123/balance');
    return { status: res.status, body: await res.text() };
  });

  // The browser's own request targeted the console's own origin, never the ledger service.
  expect(requestUrls.some((url) => url.startsWith(`${baseURL}/api/ledger/`))).toBe(true);
  expect(requestUrls.every((url) => !url.includes('4499'))).toBe(true);

  expect(result.status).toBe(200);
  expect(result.body).not.toContain('Bearer');
});
