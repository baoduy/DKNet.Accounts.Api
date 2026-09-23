/**
 * DRK-1669 §5:
 *   Scenario: The console draws its typefaces itself
 *     Given Mai has signed in
 *     When Mai opens the console with every third-party address unreachable
 *     Then the console frame renders in the typefaces the design system names
 *     And the console asks no third party for a typeface
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test('The console draws its typefaces itself', async ({ page, context, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  // Every third-party address is unreachable.
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  const thirdPartyRequests: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(baseURL!)) thirdPartyRequests.push(url);
  });

  await page.reload();
  await expect(page.getByText('LEDGER')).toBeVisible();

  expect(thirdPartyRequests.filter((u) => u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com'))).toHaveLength(0);

  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(fontFamily.toLowerCase()).toContain('inter');
});
