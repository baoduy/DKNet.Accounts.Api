/**
 * DRK-1679 §5:
 *   Scenario: The identity menu still names the directory and the permissions
 *     Given the operator Mai is signed in and her token lacks the reverse permission
 *     When she opens the identity menu
 *     Then she sees her name, her sign-in address and the directory that signed her in
 *     And she sees the permissions her token holds and the ones it does not
 *     And she sees what she cannot do without each missing permission
 *
 * Held/missing scopes are derived from `KNOWN_SCOPES` (DRK-1679 §7 slice note), never a
 * hardcoded list of three, so this stays correct when surface B widens it to five.
 *
 * The menu content restating no token value is the "new base controls" RED signal (see
 * 19-frame-survives-the-rebuild.spec.ts): today `UserMenu`'s `role="menu"` panel is a large
 * inline `style` object reading `var(--token)` directly; a shadcn `DropdownMenuContent`
 * never restates one. The marker here is narrower than 19's plain "no `style` attribute":
 * Radix's Popper writes its own inline custom properties (`--radix-popper-available-width`
 * etc.) onto the `role="menu"` element itself, so a real shadcn dropdown menu still carries
 * a `style` attribute — just never a background/color/border/box-shadow/padding value.
 */
import { expect, test } from '@playwright/test';
import { KNOWN_SCOPES } from '../../lib/scopes';
import { signInAs } from '../support/sign-in';

const GRANTED_SCOPES = ['accounts.read', 'postings.read'];
const MISSING_SCOPES = KNOWN_SCOPES.filter((scope) => !GRANTED_SCOPES.includes(scope));

test('The identity menu still names the directory and the permissions', async ({ page, baseURL }) => {
  expect(MISSING_SCOPES).toContain('postings.reverse');

  await signInAs(page, { consoleBaseUrl: baseURL!, email: 'mai-partial@drunkcoding.net' });

  const trigger = page.getByRole('button', { name: /account menu|identity/i });
  await trigger.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();

  // Her name, her sign-in address and the directory that signed her in.
  await expect(menu.getByText('Mai Nguyen')).toBeVisible();
  await expect(menu.getByText('mai-partial@drunkcoding.net')).toBeVisible();
  await expect(menu.getByText('Drunk Coding')).toBeVisible();

  // The permissions her token holds.
  for (const scope of GRANTED_SCOPES) {
    await expect(menu.getByText(scope)).toBeVisible();
  }

  // The ones it does not, and what she cannot do without each.
  for (const scope of MISSING_SCOPES) {
    await expect(menu.getByText(scope)).toBeVisible();
  }
  await expect(menu.getByText(/without this permission/i)).toBeVisible();

  // Drawn on its new base controls: no hand-rolled inline `style` restating a token value
  // (Radix's own positioning custom properties on this element are not a restated token).
  await expect(menu).not.toHaveAttribute('style', /(^|;)\s*(background|color|border|box-shadow|padding)\s*:/);
});
