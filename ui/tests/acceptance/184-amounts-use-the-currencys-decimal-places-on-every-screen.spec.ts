/**
 * DRK-1758 §5:
 *   @integration
 *   Scenario Outline: Amounts use the currency's decimal places on every screen
 *     Given currency JPY has 0 decimal places
 *     And account ACME-000456 in JPY holds 1500 JPY
 *     When treasury-ops views ACME-000456 on the <screen> screen
 *     Then every JPY amount shows 0 decimal places
 *
 *     Examples:
 *       | screen   |
 *       | Accounts |
 *       | Records  |
 *
 * treasury-ops is `MAI`. On Records, which lists postings, the row is a 1500 JPY record for
 * ACME-000456 (DRK-1758 spec-review carry-over 3). 1500 at 0 decimal places reads "1,500" ("+1,500" for the
 * credit on Records, which draws every amount with its direction's sign).
 *
 * Today each screen builds its own currency → decimal places map (`AccountsScreen.tsx:84`,
 * `RecordsScreen.tsx:128`); DRK-1763 brief §3 row 9 replaces them with one lookup, which this
 * check holds to the same behaviour.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedCurrencies, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { GLOBEX_ID, account, cellText, posting, recordRow } from '../support/records';
import { signInAs } from '../support/sign-in';

interface Row {
  screen: string;
  path: string;
  row: (page: Page) => Locator;
  /** The row's JPY amount columns. */
  amountColumns: string[];
  /** 1500 JPY at 0 decimal places, as the screen draws it: Records signs a credit. */
  expected: string;
}

const ROWS: Row[] = [
  {
    screen: 'Accounts',
    path: '/accounts',
    row: (page) => page.getByRole('main').locator('tbody tr').filter({ hasText: 'ACME-000456' }),
    amountColumns: ['Balance', 'Available'],
    expected: '1,500',
  },
  {
    screen: 'Records',
    path: '/records',
    row: (page) => recordRow(page, 'PST-000456'),
    amountColumns: ['Amount'],
    expected: '+1,500',
  },
];

for (const row of ROWS) {
  test(`Amounts use the currency's decimal places on every screen — ${row.screen}`, async ({ page, baseURL }) => {
    // Given currency JPY has 0 decimal places
    await seedCurrencies([{ code: 'JPY', name: 'Japanese Yen', decimalPlaces: 0 }]);
    // And account ACME-000456 in JPY holds 1500 JPY
    await seedLedgerAccounts([account('ACME-000456', GLOBEX_ID, { name: 'Acme yen', currency: 'JPY', decimalPlaces: 0, balance: '1500', availableBalance: '1500', heldAmount: '0' })]);
    await seedLedgerPostings([
      posting({ id: 'b0000000-0000-4000-8000-000000000456', postingNumber: 'PST-000456', accountId: GLOBEX_ID, direction: 'Credit', amount: '1500', currency: 'JPY', category: 'Transfer' }),
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

    // When treasury-ops views ACME-000456 on the <screen> screen
    await page.goto(`${baseURL}${row.path}`);
    await expect(row.row(page)).toBeVisible();

    // Then every JPY amount shows 0 decimal places
    for (const column of row.amountColumns) {
      expect(await cellText(page, row.row(page), column), `${column} on the ${row.screen} screen`).toBe(row.expected);
    }
  });
}
