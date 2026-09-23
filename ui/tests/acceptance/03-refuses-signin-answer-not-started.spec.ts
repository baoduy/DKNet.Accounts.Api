/**
 * DRK-1669 §5:
 *   Scenario: The console refuses a sign-in answer it did not start
 *     Given the console has started no sign-in for Nam
 *     When a sign-in answer naming Nam arrives at the console
 *     Then the console refuses the answer
 *     And no session is opened for Nam
 */
import { expect, test } from '@playwright/test';

test('The console refuses a sign-in answer it did not start', async ({ request, baseURL }) => {
  // A callback carrying a `state` the console never issued (R4) — nothing upstream of
  // this request ever called /signin.
  const response = await request.get(`${baseURL}/signin/callback?code=forged-code&state=never-issued-state`, {
    maxRedirects: 0,
    failOnStatusCode: false,
  });

  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.status()).toBeLessThan(500);

  const setCookie = response.headers()['set-cookie'];
  expect(setCookie ?? '').not.toContain('sessionId=');
});
