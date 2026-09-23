/**
 * DRK-1695 §5:
 *   Scenario: A group's balances are listed one line per currency
 *     Given group "TRSY" holds 1,250.00 SGD and 400.00 USD
 *     When Mai opens the group
 *     Then the screen shows one line for SGD and one line for USD
 *     And the screen shows no total, and says amounts in different currencies are not added
 *
 * Drives `/groups`, reusing `CurrencyBalanceList` (already built — its own caption already
 * carries the "not combined into a total" wording this asserts). RED today:
 * `AccountGroupsScreen` is a stub that throws (row 11), so the group's balances never reach
 * `CurrencyBalanceList`.
 */
import { expect, test } from '@playwright/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test("A group's balances are listed one line per currency", async ({ page, baseURL }) => {
  await seedAccountGroups([{ id: 'grp-trsy', code: 'TRSY', name: 'Treasury', ownerId: 'default-owner' }]);
  await seedLedgerAccounts([
    {
      accountNumber: 'TRSY-000001',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '1250.00',
      availableBalance: '1250.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
      groupId: 'grp-trsy',
    },
    {
      accountNumber: 'TRSY-000002',
      currency: 'USD',
      decimalPlaces: 2,
      balance: '400.00',
      availableBalance: '400.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
      groupId: 'grp-trsy',
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('row', { name: /TRSY/ }).click();

  const panel = page.getByTestId('detail-panel');
  await expect(panel.getByText('SGD')).toBeVisible();
  await expect(panel.getByText('1,250.00')).toBeVisible();
  await expect(panel.getByText('USD')).toBeVisible();
  await expect(panel.getByText('400.00')).toBeVisible();
  await expect(panel.getByText('not combined into a total')).toBeVisible();
});
