/**
 * DRK-1669 §5:
 *   Scenario: The identity menu states the provider, the tenant and every permission
 *     Given Mai has signed in with a token carrying accounts.read and postings.read but
 *       not postings.reverse
 *     When Mai opens the identity menu
 *     Then the menu names Microsoft Entra ID in full and names the Drunk Coding tenant
 *     And the menu lists accounts.read and postings.read as held
 *     And the menu lists postings.reverse as not held, with what Mai cannot do without it
 */
import { expect, test } from '@playwright/test';
import { MAI_MISSING_REVERSE_SCOPE } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test('The identity menu states the provider, the tenant and every permission', async ({ page, baseURL }) => {
  await signInAs(page, {
    consoleBaseUrl: baseURL!,
    email: 'mai-partial@drunkcoding.net',
  });
  expect(MAI_MISSING_REVERSE_SCOPE.scopes).toEqual(['accounts.read', 'postings.read']);

  await page.getByRole('button', { name: /account menu|identity/i }).click();

  await expect(page.getByText('Microsoft Entra ID')).toBeVisible();
  await expect(page.getByText('Drunk Coding')).toBeVisible();
  await expect(page.getByText('accounts.read')).toBeVisible();
  await expect(page.getByText('postings.read')).toBeVisible();

  const missing = page.getByText('postings.reverse');
  await expect(missing).toBeVisible();
  await expect(page.getByText(/without postings\.reverse|cannot reverse/i)).toBeVisible();
});
