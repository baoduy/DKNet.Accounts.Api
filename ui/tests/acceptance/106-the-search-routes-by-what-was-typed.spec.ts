/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario Outline: The search routes by what was typed
 *     Given the ledger holds the account ACME-000123 named "Acme Operating", with id 6d1e4f0a-2b3c-4d5e-8f90-a1b2c3d4e5f6
 *     And the group ACME with id 9a4c7e21-5d6f-4a8b-9c0d-1e2f3a4b5c6d, and the posting P-10042 with id 51b0c3d2-7e8f-4a9b-8c1d-2e3f4a5b6c7d
 *     When Mai searches for "<typed>"
 *     Then <result>
 *
 *     Examples:
 *       | typed                                | result                                                      |
 *       | 6d1e4f0a-2b3c-4d5e-8f90-a1b2c3d4e5f6 | she sees the detail screen of ACME-000123                   |
 *       | 9a4c7e21-5d6f-4a8b-9c0d-1e2f3a4b5c6d | she sees the group ACME on the Account groups screen         |
 *       | 51b0c3d2-7e8f-4a9b-8c1d-2e3f4a5b6c7d | she sees the details of P-10042 on the Records screen        |
 *       | acme-000123                          | she sees the accounts list narrowed to the number ACME-000123 |
 *       | Acme                                 | she sees matching accounts and matching groups together     |
 *
 * GLOBEX-000456 and the group GLOBEX sit beside them, so "narrowed" and "matching" each leave
 * something out. RED today: the Overview search does not exist.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccountGroups, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { searchFor, searchResults } from '../support/overview';
import { GLOBEX_ID, account, posting } from '../support/records';
import { signInAs } from '../support/sign-in';

const ACME_ACCOUNT_ID = '6d1e4f0a-2b3c-4d5e-8f90-a1b2c3d4e5f6';
const ACME_GROUP_ID = '9a4c7e21-5d6f-4a8b-9c0d-1e2f3a4b5c6d';
const P_10042_ID = '51b0c3d2-7e8f-4a9b-8c1d-2e3f4a5b6c7d';

test.beforeEach(async () => {
  await seedLedgerAccountGroups([
    { id: ACME_GROUP_ID, code: 'ACME', name: 'Acme Corporation', type: 'Customer', ownerId: 'acme-owner' },
    { id: 'c0000000-0000-4000-8000-000000000456', code: 'GLOBEX', name: 'Globex Holdings', type: 'Customer', ownerId: 'globex-owner' },
  ]);
  await seedLedgerAccounts([
    account('ACME-000123', ACME_ACCOUNT_ID, { name: 'Acme Operating', groupId: ACME_GROUP_ID }),
    account('GLOBEX-000456', GLOBEX_ID, { name: 'Globex Operating' }),
  ]);
  await seedLedgerPostings([
    posting({ id: P_10042_ID, postingNumber: 'P-10042', accountId: ACME_ACCOUNT_ID, direction: 'Credit', amount: '25.00', currency: 'SGD', category: 'Transfer' }),
  ]);
});

async function searchFromOverview(page: Page, baseURL: string, typed: string): Promise<void> {
  await signInAs(page, { consoleBaseUrl: baseURL, email: MAI.email });
  await page.goto(`${baseURL}/`);
  await searchFor(page, typed);
}

test('The search routes by what was typed — an account identifier opens its detail screen', async ({ page, baseURL }) => {
  await searchFromOverview(page, baseURL!, ACME_ACCOUNT_ID);

  await expect(page).toHaveURL(`${baseURL}/accounts/ACME-000123`);
  await expect(page.getByTestId('account-balance')).toBeVisible();
});

test('The search routes by what was typed — a group identifier opens it on the Account groups screen', async ({ page, baseURL }) => {
  await searchFromOverview(page, baseURL!, ACME_GROUP_ID);

  await expect.poll(() => new URL(page.url()).pathname).toBe('/groups');
  await expect(page.getByTestId('detail-panel')).toContainText('ACME');
  await expect(page.getByTestId('detail-panel')).not.toContainText('GLOBEX');
});

test('The search routes by what was typed — a posting identifier opens its details on the Records screen', async ({ page, baseURL }) => {
  await searchFromOverview(page, baseURL!, P_10042_ID);

  await expect.poll(() => new URL(page.url()).pathname).toBe('/records');
  await expect(page.getByTestId('detail-panel')).toContainText('P-10042');
});

test('The search routes by what was typed — an account number narrows the accounts list', async ({ page, baseURL }) => {
  await searchFromOverview(page, baseURL!, 'acme-000123');

  await expect(page).toHaveURL(`${baseURL}/accounts?accountNumber=ACME-000123`);
  const rows = page.getByRole('main').locator('tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('ACME-000123');
});

test('The search routes by what was typed — free text shows matching accounts and matching groups together', async ({ page, baseURL }) => {
  await searchFromOverview(page, baseURL!, 'Acme');

  const accounts = searchResults(page).getByRole('region', { name: 'Matching accounts', exact: true });
  const groups = searchResults(page).getByRole('region', { name: 'Matching groups', exact: true });
  await expect(accounts.getByRole('listitem')).toHaveCount(1);
  await expect(accounts.getByRole('listitem').first()).toContainText('ACME-000123');
  await expect(groups.getByRole('listitem')).toHaveCount(1);
  await expect(groups.getByRole('listitem').first()).toContainText('ACME');
  await expect(searchResults(page)).not.toContainText('GLOBEX');
});
