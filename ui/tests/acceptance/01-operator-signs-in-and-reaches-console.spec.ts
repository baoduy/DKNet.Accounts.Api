/**
 * DRK-1669 §5:
 *   Scenario: An operator signs in and reaches the framed console
 *     Given Mai is an operations analyst in the Drunk Coding directory
 *     And Mai has not signed in
 *     When Mai opens the console
 *     Then Mai is sent to Microsoft Entra ID
 *     And after signing in Mai sees the console frame with no screen content
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('An operator signs in and reaches the framed console', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);

  // Mai is sent to Microsoft Entra ID (the fake issuer's sign-in form).
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email, startPath: '/' });

  // After signing in Mai sees the console frame with no screen content.
  await expect(page).toHaveURL(new RegExp(`^${baseURL}/`));
  await expect(page.getByText('LEDGER')).toBeVisible();
  await expect(page.getByText('ADMINISTRATION')).toBeVisible();
});
