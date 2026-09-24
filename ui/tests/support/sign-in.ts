import type { Page } from '@playwright/test';

/**
 * Drives the console's `/signin` through the fake OIDC issuer's sign-in form, the same
 * way an operator drives a real Microsoft Entra ID prompt.
 */
export async function signInAs(
  page: Page,
  options: {
    consoleBaseUrl: string;
    email: string;
    accessTokenOverride?: string;
    expiresInOverride?: number;
    startPath?: string;
  },
): Promise<void> {
  const startPath = options.startPath ?? '/signin';
  await page.goto(`${options.consoleBaseUrl}${startPath}`);
  await page.getByLabel('Email').fill(options.email);
  if (options.accessTokenOverride) {
    await page
      .locator('input[name="accessTokenOverride"]')
      .evaluate((el, value) => ((el as HTMLInputElement).value = value), options.accessTokenOverride);
  }
  if (options.expiresInOverride !== undefined) {
    await page
      .locator('input[name="expiresInOverride"]')
      .evaluate((el, value) => ((el as HTMLInputElement).value = String(value)), options.expiresInOverride);
  }
  await page.getByRole('button', { name: 'Sign in' }).click();
  // The click submits the fake issuer's (cross-origin) form, which redirects back through
  // `/signin/callback` — where the session cookie is set — to `returnTo`. Waiting for the
  // browser to land back on the console's own origin guarantees that cookie is committed
  // before a caller's next action (e.g. a same-context `page.request` call).
  await page.waitForURL((url) => url.origin === new URL(options.consoleBaseUrl).origin);
}
