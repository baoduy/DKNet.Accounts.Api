/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: An account number that matches nothing offers a text search
 *     Given no account carries the number FEE-REFUND
 *     When Mai searches for "fee-refund"
 *     Then she reads that no account carries the number FEE-REFUND
 *     And she is offered a search of accounts and groups for "fee-refund"
 *
 * The group FEEREF, named "Fee refunds", is what taking the offer finds. RED today: the
 * Overview search does not exist.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccountGroups, seedLedgerAccounts } from '../support/ledger';
import { searchFor, searchResults } from '../support/overview';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

test('An account number that matches nothing offers a text search', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await seedLedgerAccountGroups([{ id: 'c2000000-0000-4000-8000-000000000001', code: 'FEEREF', name: 'Fee-refund desk', type: 'Internal', ownerId: 'ops' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/`);

  await searchFor(page, 'fee-refund');

  const results = searchResults(page);
  await expect(results.getByText('No account carries the number FEE-REFUND.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${baseURL}/`);
  const offer = results.getByRole('button', { name: 'Search accounts and groups for "fee-refund"', exact: true });
  await expect(offer).toBeVisible();

  await offer.click();
  const groups = searchResults(page).getByRole('region', { name: 'Matching groups', exact: true });
  await expect(groups.getByRole('listitem')).toHaveCount(1);
  await expect(groups.getByRole('listitem').first()).toContainText('FEEREF');
});
