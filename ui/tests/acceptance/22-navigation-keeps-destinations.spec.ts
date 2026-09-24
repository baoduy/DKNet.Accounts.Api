/**
 * DRK-1679 §5:
 *   Scenario: Navigation keeps the destinations it has today
 *     Given the operator Mai is on the console
 *     When she reads the navigation
 *     Then she sees the ledger destinations first and the administration destinations last
 *     And the destination she is on is marked as the one she is on
 *
 * The "new base controls" RED signal (see 19-frame-survives-the-rebuild.spec.ts): today
 * every `Sidebar` nav link (`ui/components/shell/Sidebar.tsx:87-108`) carries a large
 * inline `style` object. A shadcn-based link is styled by class name, not `style`.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { signInAs } from '../support/sign-in';

test('Navigation keeps the destinations it has today', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  const nav = page.getByRole('navigation');
  const sectionTitles = await nav.getByText(/^(LEDGER|ADMINISTRATION)$/).allTextContents();
  expect(sectionTitles[0]).toBe('LEDGER');
  expect(sectionTitles.at(-1)).toBe('ADMINISTRATION');

  // The destination she is on (Overview, at "/") is marked as the one she is on.
  const overviewLink = nav.getByRole('link', { name: 'Overview' });
  await expect(overviewLink).toHaveAttribute('aria-current', 'page');

  const otherLink = nav.getByRole('link', { name: 'Currencies' });
  await expect(otherLink).not.toHaveAttribute('aria-current', 'page');

  // Drawn on its new base controls: no hand-rolled inline `style` restating a token.
  const links = await nav.getByRole('link').all();
  for (const link of links) {
    await expect(link).not.toHaveAttribute('style', /.+/);
  }
});
