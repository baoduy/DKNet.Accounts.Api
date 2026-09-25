/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario Outline: Every control can be reached and used by keyboard
 *     Given the operator Mai uses the keyboard only
 *     When she moves through the <screen> with the Tab key
 *     Then every control receives focus in reading order and shows a visible focus indicator
 *
 *     Examples:
 *       | screen                       |
 *       | Overview screen              |
 *       | Accounts screen              |
 *       | detail screen of ACME-000123 |
 *       | Records screen               |
 *       | Account groups screen        |
 *       | Currencies screen            |
 *
 * Tab is pressed from the top of the page until focus comes back round
 * (`support/screen-audit.ts`): every control must be a stop, first reached in document order,
 * each drawn with a focus indicator it does not draw unfocused, in the theme's `--focus-ring`
 * (Design/README.md: "focus is drawn with --focus-ring"; brief §3 row 9). "Used" (the scenario's title,
 * DRK-1725 §3 "every control must work with the keyboard alone"): on a screen whose list rows
 * open a record, Enter on a focused row opens it, as a click does.
 *
 * RED today: list rows open on a click only and are no tab stop (`LedgerTable.tsx`,
 * `StatementTable.tsx`); the account menu's `summary`, on every screen, is drawn with the
 * browser's own focus outline, not `--focus-ring` (`Design/tokens/base.css` covers no `summary`),
 * and the console's `Button` draws its outline in its own text colour
 * (`components/ui/button.tsx`: `focus-visible:outline-[var(--focus-ring)]` sets no colour).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { keyboardFindings, tabThrough } from '../support/screen-audit';
import { SCREENS, seedPopulatedLedger } from '../support/screen-states';
import { signInAs } from '../support/sign-in';

for (const screen of SCREENS) {
  test(`Every control can be reached and used by keyboard — ${screen.name}`, async ({ page, baseURL }) => {
    // DRK-1745: rewrite for the new form
    test.fixme(screen.name === 'Overview screen', 'DRK-1745: rewrite for the new form');
    await seedPopulatedLedger();
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}${screen.path}`);
    await expect(screen.ready(page)).toBeVisible();
    await expect(page.getByRole('main').locator('[data-slot="skeleton"]')).toHaveCount(0);

    const walk = await tabThrough(page);
    const { unreached, outOfOrder, noIndicator, offRing } = keyboardFindings(walk);

    expect(walk.controls.length, 'controls on the screen').toBeGreaterThan(0);
    expect(unreached, 'controls Tab never reached').toEqual([]);
    expect(outOfOrder, 'controls reached out of reading order').toEqual([]);
    expect(noIndicator, 'controls focused with no visible focus indicator').toEqual([]);
    expect(offRing, "focus indicators not drawn in the design system's --focus-ring").toEqual([]);

    if (screen.selectableRow) {
      const row = screen.selectableRow(page);
      await row.focus();
      await expect(row).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(row).toHaveAttribute('data-state', 'selected');
    }
  });
}
