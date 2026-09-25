import { expect, type Locator, type Page } from '@playwright/test';

/**
 * DRK-1727 — how the acceptance specs 105 to 125 drive the Overview screen (`/`) and the search
 * every screen carries. The names below are the screens' contract with these specs:
 *
 * - search: one field per screen, `type="search"` (role `searchbox`), labelled
 *   `Search accounts, groups and postings` — on Overview the page's own field, on every other
 *   screen the top bar's. A search is sent when the operator presses Enter in it.
 *   ⌘K on a Mac, Ctrl+K elsewhere, puts focus in it.
 * - results: a region named `Search results` under the field. A free-text search shows two
 *   regions inside it, `Matching accounts` and `Matching groups`, each one list item per match,
 *   the service's total as `<n> accounts matched` / `<n> groups matched`, and a link to the full
 *   list on its own screen carrying the same search. Every statement the search makes (nothing
 *   found, a partial lookup, a number no account carries) is drawn inside `Search results`.
 * - Overview panels: regions in `main` named `Position by currency`, `Accounts by status`,
 *   `Groups by status`, `Postings per week`, `Accounts opened per month`, `Recently viewed`.
 *   The first five draw their figures as a table — one body row per currency, status, week or
 *   month, its label in the row's first cell. Week labels read `2026-09-18 to 2026-09-24`,
 *   month labels `September 2026`.
 * - a panel the operator has no permission for says `requires <scope>` in its region (the
 *   `ScopeGate` caption the console already uses).
 * - Recently viewed: one list item per record in its region.
 */

export const SEARCH_LABEL = 'Search accounts, groups and postings';

export function searchField(page: Page): Locator {
  return page.getByRole('searchbox', { name: SEARCH_LABEL });
}

/** Types `typed` into the screen's search field and sends it. */
export async function searchFor(page: Page, typed: string): Promise<void> {
  const field = searchField(page);
  await field.fill(typed);
  await field.press('Enter');
}

export function searchResults(page: Page): Locator {
  return page.getByRole('region', { name: 'Search results' });
}

export function panel(page: Page, name: 'Position by currency' | 'Accounts by status' | 'Groups by status' | 'Postings per week' | 'Accounts opened per month' | 'Recently viewed'): Locator {
  return page.getByRole('main').getByRole('region', { name, exact: true });
}

/**
 * The text of the cell under `header` in the body row of `region`'s table whose first cell reads
 * exactly `rowLabel`. `header` null reads the row's last cell.
 */
export async function tableCell(region: Locator, rowLabel: string, header: string | null): Promise<string> {
  const table = region.getByRole('table');
  await expect(table.locator('tbody tr').first()).toBeVisible();
  const headers = (await table.locator('thead th').allTextContents()).map((text) => text.trim());
  const rows = await table.locator('tbody tr').all();
  for (const row of rows) {
    const cells = (await row.locator('th, td').allTextContents()).map((text) => text.trim());
    if (cells[0] !== rowLabel) continue;
    if (header === null) return cells[cells.length - 1];
    const index = headers.indexOf(header);
    expect(index, `column "${header}" in ${JSON.stringify(headers)}`).toBeGreaterThanOrEqual(0);
    return cells[index];
  }
  throw new Error(`no row "${rowLabel}" in the table of ${await region.getAttribute('aria-label') ?? 'the region'}`);
}

/** Every body row's first cell, in order. */
export async function rowLabels(region: Locator): Promise<string[]> {
  const table = region.getByRole('table');
  await expect(table.locator('tbody tr').first()).toBeVisible();
  const rows = await table.locator('tbody tr').all();
  return Promise.all(rows.map(async (row) => ((await row.locator('th, td').first().textContent()) ?? '').trim()));
}

/** Opens an account's detail screen and waits until it has drawn the account. */
export async function openAccount(page: Page, baseURL: string, accountNumber: string): Promise<void> {
  await page.goto(`${baseURL}/accounts/${accountNumber}`);
  await expect(page.getByTestId('account-balance')).toBeVisible();
}

/** Opens a posting's details on the Records screen. */
export async function openPosting(page: Page, baseURL: string, postingId: string, postingNumber: string): Promise<void> {
  await page.goto(`${baseURL}/records?open=${postingId}`);
  await expect(page.getByTestId('detail-panel')).toContainText(postingNumber);
}

/** Opens a group in its side panel on the Account groups screen, by choosing its row. */
export async function openGroup(page: Page, baseURL: string, code: string): Promise<void> {
  await page.goto(`${baseURL}/groups`);
  await page.getByRole('row').filter({ has: page.getByRole('cell', { name: code, exact: true }) }).click();
  await expect(page.getByTestId('detail-panel')).toBeVisible();
}

/** Ends the session through the console's own `POST /signout`; the browser keeps its storage. */
export async function signOut(page: Page, baseURL: string): Promise<void> {
  const response = await page.request.post(`${baseURL}/signout`, { maxRedirects: 0 });
  expect(response.status()).toBe(303);
}
