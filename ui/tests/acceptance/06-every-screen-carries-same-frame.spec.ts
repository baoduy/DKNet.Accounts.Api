/**
 * DRK-1669 §5:
 *   Scenario: Every screen carries the same frame
 *     Given Mai has signed in
 *     When Mai opens the console
 *     Then the left navigation shows a ledger section at its top
 *     And the left navigation shows an administration section at its foot
 *     And the top bar shows a search field and the identity menu
 *     And the page carries a page header above its content
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test('Every screen carries the same frame', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const nav = page.getByRole('navigation');
  const sectionTitles = await nav.getByText(/^(LEDGER|ADMINISTRATION)$/).allTextContents();
  expect(sectionTitles[0]).toBe('LEDGER');
  expect(sectionTitles.at(-1)).toBe('ADMINISTRATION');

  await expect(page.getByRole('search')).toBeVisible();
  await expect(page.getByRole('button', { name: /account menu|identity/i })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
});
