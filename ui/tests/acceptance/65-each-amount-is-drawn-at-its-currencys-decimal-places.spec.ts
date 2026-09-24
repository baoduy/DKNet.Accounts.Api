/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: Each amount is drawn at its currency's decimal places
 *     Given the currency <currency> uses <places> decimal places
 *     And the ledger holds a credit of <recorded> <currency> on an account in <currency>, effective this week
 *     When the operator Mai opens the Records screen
 *     Then the row shows the amount as <shown>
 *
 *     Examples:
 *       | currency | places | recorded | shown      |
 *       | SGD      | 2      | 100      | 100.00 SGD |
 *       | JPY      | 0      | 500      | 500 JPY    |
 *
 * `shown` is the row's Amount cell followed by its Currency cell. RED today: no `/records` route.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedCurrencies, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, account, cellText, daysAgo, posting, recordRow } from '../support/records';
import { signInAs } from '../support/sign-in';

const EXAMPLES = [
  { currency: 'SGD', places: 2, recorded: '100', shown: '100.00 SGD' },
  { currency: 'JPY', places: 0, recorded: '500', shown: '500 JPY' },
];

for (const { currency, places, recorded, shown } of EXAMPLES) {
  test(`Each amount is drawn at its currency's decimal places — ${currency}`, async ({ page, baseURL }) => {
    await seedCurrencies([{ code: currency, decimalPlaces: places }]);
    await seedLedgerAccounts([account('ACME-000123', ACME_ID, { currency, decimalPlaces: places, balance: recorded, availableBalance: recorded, heldAmount: '0' })]);
    await seedLedgerPostings([
      posting({ id: 'b0000000-0000-4000-8000-000000010042', postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Credit', amount: recorded, currency, category: 'Transfer', effectiveDate: daysAgo(1) }),
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

    await page.goto(`${baseURL}/records`);

    const row = recordRow(page, 'P-10042');
    await expect(row).toHaveCount(1);
    expect(`${await cellText(page, row, 'Amount')} ${await cellText(page, row, 'Currency')}`).toBe(shown);
  });
}
