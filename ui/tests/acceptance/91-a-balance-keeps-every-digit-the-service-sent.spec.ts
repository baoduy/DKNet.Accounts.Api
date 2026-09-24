/**
 * DRK-1695 §5:
 *   Scenario Outline: A balance keeps every digit the service sent
 *     Given group "TRSY" holds <amount> in <currency>, which has <places> decimal places
 *     When Mai opens the group's balances
 *     Then the line for <currency> reads <shown>
 *
 *     Examples:
 *       | amount              | currency | places | shown                     |
 *       | 9007199254740993.01 | SGD      | 2      | 9,007,199,254,740,993.01  |
 *       | 1250                | VND      | 0      | 1,250                     |
 *       | 0.005               | BHD      | 3      | 0.005                     |
 *
 * `fake-ledger-service.ts` (row 14) answers `GET /v1/account-groups/:id/balances` with
 * `balance` as a raw (unquoted) JSON number literal holding the exact source digits — what
 * the real service sends (`AccountGroupBalanceLineDto.Balance` is a C# `decimal`). RED today
 * on two fronts: `money-json.ts` (row 7) and `AccountGroupsScreen` (row 11) are stubs that
 * throw, and even once wired, `9007199254740993.01` loses its last two digits the moment
 * anything routes it through a JS `number` (2^53 ≈ 9.007199254740992×10^15) — the guard R1
 * exists to prove.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedAccountGroups, seedCurrencies, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

const CASES = [
  { amount: '9007199254740993.01', currency: 'SGD', places: 2, shown: '9,007,199,254,740,993.01' },
  { amount: '1250', currency: 'VND', places: 0, shown: '1,250' },
  { amount: '0.005', currency: 'BHD', places: 3, shown: '0.005' },
];

for (const { amount, currency, places, shown } of CASES) {
  test(`A balance keeps every digit the service sent — ${currency}`, async ({ page, baseURL }) => {
    await seedCurrencies([{ code: currency, decimalPlaces: places }]);
    await seedAccountGroups([{ id: 'grp-trsy-precision', code: `TRSY-${currency}`, name: 'Treasury', ownerId: 'default-owner' }]);
    await seedLedgerAccounts([
      {
        accountNumber: `TRSY-${currency}-0001`,
        currency,
        decimalPlaces: places,
        balance: amount,
        availableBalance: amount,
        heldAmount: '0',
        permittedToGoNegative: false,
        groupId: 'grp-trsy-precision',
      },
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}/groups`);

    await page.getByRole('row', { name: new RegExp(`TRSY-${currency}`) }).click();

    await expect(page.getByTestId('detail-panel').getByText(shown, { exact: true })).toBeVisible();
  });
}
