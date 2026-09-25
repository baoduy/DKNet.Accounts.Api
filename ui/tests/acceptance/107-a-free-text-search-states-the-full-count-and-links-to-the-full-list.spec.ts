/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: A free-text search states the full count and links to the full list
 *     Given 37 accounts and 2 groups match "Acme"
 *     When Mai searches for "Acme"
 *     Then she sees 10 accounts and 2 groups
 *     And she reads that 37 accounts matched, with a link to the accounts list searched for "Acme"
 *
 * The 37 is the service's own `totalItemCount` (R1): the accounts read asks for a page of 10,
 * so a count of the rows it received could only ever say 10. A non-matching account and group
 * sit beside them. RED today: the Overview search does not exist.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccountGroups, seedLedgerAccounts } from '../support/ledger';
import { searchFor, searchResults } from '../support/overview';
import { account } from '../support/records';
import { signInAs } from '../support/sign-in';

test('A free-text search states the full count and links to the full list', async ({ page, baseURL }) => {
  await seedLedgerAccounts([
    ...Array.from({ length: 37 }, (_, i) => {
      const n = String(i + 1).padStart(6, '0');
      return account(`ACME-${n}`, `a1000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, { name: `Acme account ${n}` });
    }),
    account('GLOBEX-000456', 'a2000000-0000-4000-8000-000000000456', { name: 'Globex Operating' }),
  ]);
  await seedLedgerAccountGroups([
    { id: 'c1000000-0000-4000-8000-000000000001', code: 'ACME', name: 'Acme Corporation', type: 'Customer', ownerId: 'owner-1' },
    { id: 'c1000000-0000-4000-8000-000000000002', code: 'ACMEFX', name: 'Acme FX', type: 'Customer', ownerId: 'owner-2' },
    { id: 'c1000000-0000-4000-8000-000000000003', code: 'GLOBEX', name: 'Globex Holdings', type: 'Customer', ownerId: 'owner-3' },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/`);

  await searchFor(page, 'Acme');

  const accounts = searchResults(page).getByRole('region', { name: 'Matching accounts', exact: true });
  const groups = searchResults(page).getByRole('region', { name: 'Matching groups', exact: true });
  await expect(accounts.getByRole('listitem')).toHaveCount(10);
  await expect(groups.getByRole('listitem')).toHaveCount(2);
  await expect(accounts.getByText('37 accounts matched', { exact: true })).toBeVisible();
  await expect(groups.getByText('2 groups matched', { exact: true })).toBeVisible();

  const fullList = accounts.locator('a[href="/accounts?search=Acme"]');
  await expect(fullList).toHaveCount(1);
  await expect(groups.locator('a[href="/groups?search=Acme"]')).toHaveCount(1);

  // Ten a part, counted by the service: the accounts read asked for a page of 10.
  const accountSearch = (await ledgerRequests()).find((r) => r.method === 'GET' && r.path.startsWith('/v1/accounts?') && new URLSearchParams(r.path.split('?')[1]).get('search') === 'Acme');
  expect(accountSearch, 'an accounts read searching "Acme"').toBeDefined();
  expect(new URLSearchParams(accountSearch!.path.split('?')[1]).get('pageSize')).toBe('10');

  await fullList.click();
  await expect(page).toHaveURL(`${baseURL}/accounts?search=Acme`);
});
