/**
 * DRK-1669 §5:
 *   Scenario: The browser never holds the access token
 *     Given Mai has signed in
 *     When the console serves any page to Mai
 *     Then no access token appears in the page, in a response body, or in browser storage
 *     And the session cookie cannot be read by page scripts
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

const CANARY_ACCESS_TOKEN = 'MAI-CANARY-ACCESS-TOKEN-07-DO-NOT-EXPOSE';

test('The browser never holds the access token', async ({ page, context, baseURL }) => {
  await signInAs(page, {
    consoleBaseUrl: baseURL!,
    email: MAI.email,
    accessTokenOverride: CANARY_ACCESS_TOKEN,
  });

  const html = await page.content();
  expect(html).not.toContain(CANARY_ACCESS_TOKEN);

  const storage = await page.evaluate(() => ({
    local: JSON.stringify(window.localStorage),
    session: JSON.stringify(window.sessionStorage),
  }));
  expect(storage.local).not.toContain(CANARY_ACCESS_TOKEN);
  expect(storage.session).not.toContain(CANARY_ACCESS_TOKEN);

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === 'sessionId');
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.httpOnly).toBe(true);
});
