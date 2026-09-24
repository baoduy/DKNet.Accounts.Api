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
 *
 * The leak this scenario actually guards against is the cached token's literal bytes
 * reaching a response — as a bare JWT, not wrapped in `Bearer `. `accessTokenOverride`
 * (mirrors `09-stored-token-unreadable.spec.ts`) fixes that literal so the test can look
 * for it directly, in every same-origin response's body and headers, not one hand-picked
 * body.
 */
import { expect, test } from '../support/test';
import { FAKE_LEDGER_PORT, MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

const CANARY_ACCESS_TOKEN = 'MAI-CANARY-ACCESS-TOKEN-36-DO-NOT-LEAK-TO-BROWSER';

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
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email, accessTokenOverride: CANARY_ACCESS_TOKEN });

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  const responses: Array<{ url: string; headers: Record<string, string>; bodyPromise: Promise<string> }> = [];
  page.on('response', (response) => {
    if (!response.url().startsWith(baseURL!)) return; // same-origin only — the browser never talks to the ledger service directly
    responses.push({
      url: response.url(),
      headers: response.headers(),
      bodyPromise: response.text().catch(() => ''),
    });
  });

  // A real fetch from inside the browser page — not `page.request`, which never touches the
  // browser's own network stack — is what "the browser sends its request" actually means.
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/ledger/accounts/ACME-000123/balance');
    return { status: res.status, body: await res.text() };
  });

  // The browser's own request targeted the console's own origin, never the ledger service.
  expect(requestUrls.some((url) => url.startsWith(`${baseURL}/api/ledger/`))).toBe(true);
  expect(requestUrls.every((url) => !url.includes(String(FAKE_LEDGER_PORT)))).toBe(true);

  expect(result.status).toBe(200);
  expect(result.body).not.toContain(CANARY_ACCESS_TOKEN);

  // No response the browser received — any of them, not just the one this test triggered —
  // carries the cached token, in a header or in a body.
  for (const response of responses) {
    const body = await response.bodyPromise;
    expect(body).not.toContain(CANARY_ACCESS_TOKEN);
    for (const value of Object.values(response.headers)) {
      expect(value).not.toContain(CANARY_ACCESS_TOKEN);
    }
  }
});
