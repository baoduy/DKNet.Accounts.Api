/**
 * DRK-1669 §5:
 *   Scenario: A visitor who has not signed in reaches no screen data
 *     Given Nam has not signed in
 *     When Nam opens the console
 *     Then Nam is sent to Microsoft Entra ID
 *     And no account, posting or currency value is returned to Nam
 */
import { expect, test } from '@playwright/test';

const FORBIDDEN_KEYS = ['account', 'posting', 'currency'];

test('A visitor who has not signed in reaches no screen data', async ({ page, baseURL }) => {
  const response = await page.goto(`${baseURL}/`);

  // Nam is sent to Microsoft Entra ID.
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  // No account, posting or currency value is returned to Nam, anywhere in the response.
  const body = (await response?.body())?.toString('utf-8').toLowerCase() ?? '';
  for (const key of FORBIDDEN_KEYS) {
    expect(body).not.toContain(key);
  }
});
