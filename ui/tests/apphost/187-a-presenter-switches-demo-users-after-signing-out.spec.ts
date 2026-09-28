/**
 * DRK-1796 §5:
 *   @integration
 *   Scenario: A presenter switches demo users after signing out
 *     Given "admin" is signed in to the console
 *     When "admin" signs out and signs in again
 *     Then Keycloak asks for a user name and password
 *     And signing in as "viewer" shows the console signed in as "viewer"
 *
 * The same browser throughout, its Keycloak session cookie kept: the realm itself must show its login form on
 * every sign-in (§4 decision), since the console's sign-out ends only the console's own session.
 */
import { expect, expectKeycloakLoginForm, expectSignedInAs, signInThroughKeycloak, test } from './support/test';

test('A presenter switches demo users after signing out', async ({ page, demoConsole }) => {
  await demoConsole.start(undefined);
  await signInThroughKeycloak(page, demoConsole.baseUrl, 'admin', 'admin');
  await expectSignedInAs(page, 'admin');

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto(`${demoConsole.baseUrl}/`);

  await expectKeycloakLoginForm(page);
  await page.locator('#username').fill('viewer');
  await page.locator('#password').fill('viewer');
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => url.origin === new URL(demoConsole.baseUrl).origin);
  await expectSignedInAs(page, 'viewer');
  await expect(page.getByRole('heading', { level: 1, name: 'Overview', exact: true })).toBeVisible();
});
