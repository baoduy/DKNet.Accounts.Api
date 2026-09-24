/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: The navigation reaches the Records screen
 *     Given the operator Mai is signed in to the console
 *     When she chooses Records in the navigation
 *     Then she sees the Records screen
 *     And the navigation offers no entry that leads to a missing page
 *
 * RED today: the navigation has no `Records` entry, and its `Record posting` entry leads to
 * `/postings/new`, which does not exist.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test('The navigation reaches the Records screen', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  const nav = page.getByRole('navigation');

  await nav.getByRole('link', { name: 'Records', exact: true }).click();

  await expect(page).toHaveURL(`${baseURL}/records`);
  await expect(page.getByRole('heading', { level: 1, name: 'Records', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Records', exact: true })).toHaveAttribute('aria-current', 'page');

  await expect(nav.getByRole('link', { name: 'Record posting', exact: true })).toHaveCount(0);
  const hrefs = await nav.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(href, 'a navigation entry with no destination').not.toBe('#');
    const response = await page.request.get(`${baseURL}${href}`);
    expect(response.status(), `${href} leads to a missing page`).toBeLessThan(400);
  }
});
