/**
 * DRK-1695 §5:
 *   Scenario: Mai shares the exact view she is looking at
 *     Given Mai has narrowed the group list to closed groups, ordered it by name, and opened page 2
 *     When she copies the page address and opens it again
 *     Then the same page 2 of closed groups in name order is shown
 *
 * Drives `/groups`, reusing `parseListViewState`/`toListViewSearchParams` (already general —
 * proven for accounts by `41-list-view-can-be-shared-as-a-link.spec.ts`). RED today:
 * `AccountGroupsScreen` is a stub that throws (row 11).
 *
 * UI contract this AT fixes for Build: a `Next page` button advances the list (assumed page
 * size 10, per `Design/ui_kits/account-groups-crud/AccountGroups.jsx`'s own default) —
 * 12 closed groups seeded here so page 2 holds the last 2.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups } from '../support/ledger';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('Mai shares the exact view she is looking at', async ({ page, baseURL }) => {
  const groups = Array.from({ length: 12 }, (_, i) => {
    const index = i + 1;
    return {
      code: `SHR${String(index).padStart(3, '0')}`,
      name: `Shared ${String(index).padStart(3, '0')}`,
      ownerId: 'default-owner',
      status: 'Closed' as const,
    };
  });
  await seedAccountGroups(groups);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/groups`);
  await page.getByLabel('Status filter').selectOption('Closed');
  await page.getByRole('columnheader', { name: 'Name' }).click();
  await page.getByRole('button', { name: 'Next page' }).click();

  await expect(page.getByText('Shared 011')).toBeVisible();
  const sharedUrl = page.url();

  await page.goto(sharedUrl);

  await expect(page.getByLabel('Status filter')).toHaveValue('Closed');
  await expect(page.getByText('Shared 011')).toBeVisible();
  await expect(page.getByText('Shared 012')).toBeVisible();
  await expect(page.getByText('Shared 001')).not.toBeVisible();
});
