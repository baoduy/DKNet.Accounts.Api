/**
 * DRK-1695 §5:
 *   Scenario Outline: Mai retires a record that holds nothing
 *     Given <situation>
 *     When Mai <action> <record>
 *     Then <result>
 *
 *     Examples:
 *       | situation                                    | action      | record             | result                          |
 *       | group "SUSP" holds no account with a balance | closes      | the group "SUSP"   | the group's status is closed    |
 *       | group "SUSP" holds no account                | deletes     | the group "SUSP"   | the group is gone from the list |
 *       | no account holds a balance in "VND"          | deactivates | the currency "VND" | the currency is inactive        |
 *
 * Drives `/groups` and `/currencies`. RED today: both screens are stubs that throw (rows
 * 11-12).
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups, seedCurrencies, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('Mai closes a group that holds no account with a balance', async ({ page, baseURL }) => {
  await seedAccountGroups([{ id: 'grp-susp', code: 'SUSP', name: 'Suspense', ownerId: 'default-owner' }]);
  await seedLedgerAccounts([
    {
      accountNumber: 'SUSP-000001',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '0.00',
      availableBalance: '0.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
      groupId: 'grp-susp',
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('row', { name: /SUSP/ }).click();
  await page.getByRole('button', { name: 'Close group' }).click();

  await expect(page.getByTestId('detail-panel').getByText('Closed')).toBeVisible();
});

test('Mai deletes a group that holds no account', async ({ page, baseURL }) => {
  await seedAccountGroups([{ id: 'grp-susp-delete', code: 'SUSP', name: 'Suspense', ownerId: 'default-owner' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);

  await page.getByRole('row', { name: /SUSP/ }).click();
  await page.getByRole('button', { name: 'Delete group' }).click();

  await expect(page.getByTestId('detail-panel')).toBeHidden();
  await expect(page.getByRole('row', { name: /SUSP/ })).toHaveCount(0);
});

test('Mai deactivates a currency that no account holds a balance in', async ({ page, baseURL }) => {
  await seedCurrencies([{ code: 'VND', name: 'Vietnamese Dong', decimalPlaces: 0 }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/currencies`);

  await page.getByRole('row', { name: /VND/ }).click();
  await page.getByRole('button', { name: 'Deactivate currency' }).click();

  await expect(page.getByTestId('detail-panel').getByText('Inactive')).toBeVisible();
});
