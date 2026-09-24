/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario Outline: Loading keeps the final layout
 *     Given the service is slow to answer
 *     When the operator Mai opens the <screen>
 *     Then she sees placeholders in the shape of the final layout and no spinner
 *     And nothing on the page moves when the data arrives
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
 * "Slow" holds every ledger read the browser makes until the check lets it through (brief §7
 * slice note). "Moves" compares where every heading, column heading, label, control, link and
 * region sat while loading with where it sits once the data is drawn; a column heading the final
 * table draws must already have been drawn while loading (brief rule R1).
 *
 * RED today: Overview's panels, the Records list and the whole detail screen draw a `Loading…`
 * line; the other lists draw an empty-list line in place of their table; `Skeleton` pulses.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { expectPlaceholdersOnly, holdLedgerReads, layoutOf, movedBetween, SCREENS, seedPopulatedLedger } from '../support/screen-states';
import { signInAs } from '../support/sign-in';

for (const screen of SCREENS) {
  test(`Loading keeps the final layout — ${screen.name}`, async ({ page, baseURL }) => {
    await seedPopulatedLedger();
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    const release = await holdLedgerReads(page);

    await page.goto(`${baseURL}${screen.path}`);

    await expectPlaceholdersOnly(page);
    const loading = await layoutOf(page);

    release();
    await expect(screen.ready(page)).toBeVisible();
    await expect(page.getByRole('main').locator('[data-slot="skeleton"]')).toHaveCount(0);
    const loaded = await layoutOf(page);

    expect(movedBetween(loading, loaded), 'what moved when the data arrived').toEqual([]);
  });
}
