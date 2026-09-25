/**
 * DRK-1679 §5:
 *   Scenario: The frame an operator already knows survives the rebuild
 *     Given the operator Mai signs in to the console
 *     When the console draws a screen on its new base controls
 *     Then she reaches the console without signing in a second time
 *     And she sees the same frame as before: the navigation, the page header and the
 *       identity menu
 *
 * "on its new base controls" is the RED signal this test pins: today every control the
 * frame draws (`ui/components/core.tsx`) is styled with an inline `style` object reading
 * `var(--token)` directly on the element. A shadcn control is styled through its own
 * class names, never an inline `style` attribute restating a token (R1, R3) — so the
 * identity-menu trigger carrying no `style` attribute is what proves the frame is drawn on
 * its new base controls, not merely that its behaviour still looks the same.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('The frame an operator already knows survives the rebuild', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  // She reaches the console without signing in a second time: reloading keeps her signed in.
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`^${baseURL}/$`));
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);

  // She sees the same frame as before: the navigation, the page header and the identity menu.
  const nav = page.getByRole('navigation');
  await expect(nav.getByText('LEDGER')).toBeVisible();
  await expect(nav.getByText('ADMINISTRATION')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const identityMenuTrigger = page.getByRole('button', { name: /account menu|identity/i });
  await expect(identityMenuTrigger).toBeVisible();

  // Drawn on its new base controls: no hand-rolled inline `style` restating a token.
  await expect(identityMenuTrigger).not.toHaveAttribute('style', /.+/);
});
