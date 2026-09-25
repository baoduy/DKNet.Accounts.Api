/**
 * DRK-1695 §5:
 *   Scenario Outline: Mai narrows the group list
 *     Given 40 account groups exist, 12 of them closed, and 5 of them owned by "partner-bank-01"
 *     When Mai narrows the list to <narrowing> and orders them by name
 *     Then the screen shows <count> groups in name order
 *
 *     Examples:
 *       | narrowing                         | count |
 *       | closed groups                     | 12    |
 *       | groups owned by "partner-bank-01" | 5     |
 *
 * Drives `/groups` (DRK-1697 §3 row 13). RED today: `AccountGroupsScreen` is a stub that
 * throws (row 11), so the page never renders the list, filters or sorted rows this asserts.
 *
 * UI contract this AT fixes for Build: a `Status filter` select and an `Owner filter` text
 * input narrow the list; a `Name` column header sorts it (`LedgerTable`'s existing sortable
 * column convention).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups } from '../support/ledger';
import { signInAs } from '../support/sign-in';

function paddedName(index: number): string {
  return `Group ${String(index).padStart(3, '0')}`;
}

test.beforeEach(async () => {
  const groups = Array.from({ length: 40 }, (_, i) => {
    const index = i + 1;
    return {
      code: `GRP${String(index).padStart(3, '0')}`,
      name: paddedName(index),
      ownerId: index >= 13 && index <= 17 ? 'partner-bank-01' : 'default-owner',
      status: index <= 12 ? ('Closed' as const) : ('Active' as const),
    };
  });
  await seedAccountGroups(groups);
});

test('Mai narrows the group list to closed groups', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByLabel('Status filter').selectOption('Closed');
  await page.getByRole('columnheader', { name: 'Name' }).click();

  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(12);
  const names = await rows.locator('td').filter({ hasText: /^Group \d{3}$/ }).allTextContents();
  expect(names).toEqual([...names].sort());
});

test('Mai narrows the group list to groups owned by partner-bank-01', async ({ page, baseURL }) => {
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByLabel('Owner filter').fill('partner-bank-01');
  await page.getByRole('columnheader', { name: 'Name' }).click();

  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(5);
  const names = await rows.locator('td').filter({ hasText: /^Group \d{3}$/ }).allTextContents();
  expect(names).toEqual(['Group 013', 'Group 014', 'Group 015', 'Group 016', 'Group 017']);
});
