/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario Outline: The search is one shortcut away on every screen
 *     Given the operator Mai is on the <screen>
 *     And she has pressed the search shortcut
 *     When she searches for "acme-000123"
 *     Then she sees the accounts list narrowed to the number ACME-000123
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
 * Focus is taken off whatever holds it before the shortcut, so the shortcut — not an autofocus
 * — is what puts it in the search field. `ControlOrMeta+K` is ⌘K on a Mac, Ctrl+K elsewhere.
 * The typing goes to the focused element, so a shortcut that focused nothing sends nothing.
 * RED today: no screen answers the shortcut and no screen routes a search.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { searchField } from '../support/overview';
import { ACME_ID, GLOBEX_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

const SCREENS = [
  { screen: 'Overview screen', path: '/' },
  { screen: 'Accounts screen', path: '/accounts' },
  { screen: 'detail screen of ACME-000123', path: '/accounts/ACME-000123' },
  { screen: 'Records screen', path: '/records' },
  { screen: 'Account groups screen', path: '/groups' },
  { screen: 'Currencies screen', path: '/currencies' },
];

for (const { screen, path } of SCREENS) {
  test(`The search is one shortcut away on every screen — ${screen}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID), account('GLOBEX-000456', GLOBEX_ID)]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    await page.keyboard.press('ControlOrMeta+K');
    await expect(searchField(page)).toBeFocused();
    await page.keyboard.type('acme-000123');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(`${baseURL}/accounts?accountNumber=ACME-000123`);
    const rows = page.getByRole('main').locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('ACME-000123');
  });
}
