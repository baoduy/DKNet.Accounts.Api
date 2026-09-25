/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario Outline: A recent record that cannot be read says so in place
 *     Given <operator> opened <record>, and <since>
 *     When <operator> opens the Overview screen
 *     Then the recently viewed entry for <record> says <statement>
 *
 *     Examples:
 *       | operator | record              | since                                             | statement                                                                 |
 *       | Mai      | the group TEMP      | the group has since been deleted                  | the group can no longer be found                                          |
 *       | Nam      | the posting P-10042 | he has since lost the postings read permission    | he may no longer read it, and that reading it needs the postings read permission |
 *
 * The browser keeps only the identifier (§3a), so the entry is found as the only one in the list
 * beside ACME-000123, opened first and still readable. Nam "before" is the same operator (same
 * object id) signed in with the postings read permission (`NAM_WITH_POSTINGS_READ`). RED today:
 * no screen keeps what was opened.
 */
import { expect, test } from '../support/test';
import { MAI, NAM, NAM_WITH_POSTINGS_READ } from '../support/fixtures';
import { deleteLedgerAccountGroup, seedLedgerAccountGroups, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { openAccount, openGroup, openPosting, panel, signOut } from '../support/overview';
import { ACME_ID, account, posting } from '../support/records';
import { signInAs } from '../support/sign-in';

const TEMP_ID = 'c7000000-0000-4000-8000-000000000001';
const P_10042_ID = '51b0c3d2-7e8f-4a9b-8c1d-2e3f4a5b6c7d';

test('A recent record that cannot be read says so in place — a deleted group', async ({ page, baseURL }) => {
  await seedLedgerAccountGroups([{ id: TEMP_ID, code: 'TEMP', name: 'Temporary', type: 'Suspense', ownerId: 'ops' }]);
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme Operating' })]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await openAccount(page, baseURL!, 'ACME-000123');
  await openGroup(page, baseURL!, 'TEMP');
  await deleteLedgerAccountGroup(TEMP_ID);

  await page.goto(`${baseURL}/`);

  const entries = panel(page, 'Recently viewed').getByRole('listitem');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toContainText('This group can no longer be found.');
  await expect(entries.nth(1)).toContainText('ACME-000123');
  await expect(entries.nth(1)).not.toContainText('can no longer be found');
});

test('A recent record that cannot be read says so in place — a posting no longer permitted', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme Operating' })]);
  await seedLedgerPostings([
    posting({ id: P_10042_ID, postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Credit', amount: '25.00', currency: 'SGD', category: 'Transfer' }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: NAM_WITH_POSTINGS_READ.email });
  await openAccount(page, baseURL!, 'ACME-000123');
  await openPosting(page, baseURL!, P_10042_ID, 'P-10042');
  await signOut(page, baseURL!);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: NAM.email });

  await page.goto(`${baseURL}/`);

  const entries = panel(page, 'Recently viewed').getByRole('listitem');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0).getByText('You may no longer read this posting.', { exact: true })).toBeVisible();
  await expect(entries.nth(0).getByText('requires postings.read', { exact: true })).toBeVisible();
  await expect(entries.nth(0)).not.toContainText('P-10042');
  await expect(entries.nth(1)).toContainText('ACME-000123');
});
