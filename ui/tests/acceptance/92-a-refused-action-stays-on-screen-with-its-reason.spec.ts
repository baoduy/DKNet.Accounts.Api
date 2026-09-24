/**
 * DRK-1695 §5:
 *   Scenario Outline: A refused action stays on screen with its reason
 *     Given <situation>
 *     When Mai opens <record>
 *     Then <action> is on screen and disabled
 *     And the reason and the code <refusal> are shown beside it
 *
 *     Examples:
 *       | situation                                       | record             | action     | refusal                  |
 *       | group "TRSY" holds an account with 1,250.00 SGD  | the group "TRSY"   | close      | "GROUP_HOLDS_BALANCE"    |
 *       | group "TRSY" holds 1 account                     | the group "TRSY"   | delete     | "GROUP_NOT_EMPTY"        |
 *       | an account holds 400.00 USD                      | the currency "USD" | deactivate | "CURRENCY_HOLDS_BALANCE" |
 *
 * Drives `/groups` and `/currencies`. RED today: both screens are stubs that throw (rows
 * 11-12), so neither the disabled action nor its reason+code exist yet. R5: the action stays
 * on screen, disabled — never hidden.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups, seedCurrencies, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

test('Close stays on screen, disabled, with GROUP_HOLDS_BALANCE beside it', async ({ page, baseURL }) => {
  await seedAccountGroups([{ id: 'grp-trsy-holds', code: 'TRSY', name: 'Treasury', ownerId: 'default-owner' }]);
  await seedLedgerAccounts([
    {
      accountNumber: 'TRSY-HOLDS-0001',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '1250.00',
      availableBalance: '1250.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
      groupId: 'grp-trsy-holds',
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);
  await page.getByRole('row', { name: /TRSY/ }).click();

  const closeButton = page.getByTestId('detail-panel').getByRole('button', { name: 'Close group' });
  await expect(closeButton).toBeDisabled();
  await expect(page.getByTestId('detail-panel').getByText('GROUP_HOLDS_BALANCE')).toBeVisible();
});

test('Delete stays on screen, disabled, with GROUP_NOT_EMPTY beside it', async ({ page, baseURL }) => {
  await seedAccountGroups([{ id: 'grp-trsy-nonempty', code: 'TRSY', name: 'Treasury', ownerId: 'default-owner' }]);
  await seedLedgerAccounts([
    {
      accountNumber: 'TRSY-NONEMPTY-0001',
      currency: 'SGD',
      decimalPlaces: 2,
      balance: '0.00',
      availableBalance: '0.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
      groupId: 'grp-trsy-nonempty',
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/groups`);
  await page.getByRole('row', { name: /TRSY/ }).click();

  const deleteButton = page.getByTestId('detail-panel').getByRole('button', { name: 'Delete group' });
  await expect(deleteButton).toBeDisabled();
  await expect(page.getByTestId('detail-panel').getByText('GROUP_NOT_EMPTY')).toBeVisible();
});

test('Deactivate stays on screen, disabled, with CURRENCY_HOLDS_BALANCE beside it', async ({ page, baseURL }) => {
  await seedCurrencies([{ code: 'USD', name: 'United States Dollar', decimalPlaces: 2 }]);
  await seedLedgerAccounts([
    {
      accountNumber: 'USD-HOLDS-0001',
      currency: 'USD',
      decimalPlaces: 2,
      balance: '400.00',
      availableBalance: '400.00',
      heldAmount: '0.00',
      permittedToGoNegative: false,
    },
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.goto(`${baseURL}/currencies`);
  await page.getByRole('row', { name: /USD/ }).click();

  const deactivateButton = page.getByTestId('detail-panel').getByRole('button', { name: 'Deactivate currency' });
  await expect(deactivateButton).toBeDisabled();
  await expect(page.getByTestId('detail-panel').getByText('CURRENCY_HOLDS_BALANCE')).toBeVisible();
});
