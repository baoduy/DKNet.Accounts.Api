/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: The console opens on Overview with the search ready
 *     Given the operator Mai is signed in
 *     When she opens the console
 *     Then she sees the Overview screen
 *     And the search field has focus
 *
 * RED today: `/` is the empty "Console" frame (`app/page.tsx`), its search box unlabelled.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { searchField } from '../support/overview';
import { signInAs } from '../support/sign-in';

test('The console opens on Overview with the search ready', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/`);

  await expect(page.getByRole('heading', { level: 1, name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Console', exact: true })).toHaveCount(0);
  await expect(searchField(page)).toBeFocused();
});
