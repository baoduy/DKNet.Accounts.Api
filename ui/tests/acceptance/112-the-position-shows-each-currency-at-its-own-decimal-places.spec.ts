/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario Outline: The position shows each currency at its own decimal places
 *     Given the ledger-wide position holds <currency> with balance <balance>, available <available> and held <held>
 *     When the operator Mai opens the Overview screen
 *     Then the <currency> row shows balance <balance>, available <available> and held <held>
 *
 *     Examples:
 *       | currency | balance      | available    | held      |
 *       | SGD      | 1,250.50     | 1,200.50     | 50.00     |
 *       | JPY      | 500,000      | 500,000      | 0         |
 *       | USDT     | 10.123456    | 10.123456    | 0.000000  |
 *
 * The position is `GET /v1/accounts/balances`, which the stand-in ledger sums from the accounts
 * it holds; each example seeds one account carrying exactly that line. USDT is a 6-place
 * currency (DRK-1677). RED today: `/` draws no position.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedCurrencies, seedLedgerAccounts } from '../support/ledger';
import { panel, tableCell } from '../support/overview';
import { account } from '../support/records';
import { signInAs } from '../support/sign-in';

const EXAMPLES = [
  { currency: 'SGD', decimalPlaces: 2, seed: { balance: '1250.50', availableBalance: '1200.50', heldAmount: '50.00' }, balance: '1,250.50', available: '1,200.50', held: '50.00' },
  { currency: 'JPY', decimalPlaces: 0, seed: { balance: '500000', availableBalance: '500000', heldAmount: '0' }, balance: '500,000', available: '500,000', held: '0' },
  { currency: 'USDT', decimalPlaces: 6, seed: { balance: '10.123456', availableBalance: '10.123456', heldAmount: '0.000000' }, balance: '10.123456', available: '10.123456', held: '0.000000' },
];

for (const { currency, decimalPlaces, seed, balance, available, held } of EXAMPLES) {
  test(`The position shows each currency at its own decimal places — ${currency}`, async ({ page, baseURL }) => {
    await seedCurrencies([{ code: 'USDT', name: 'Tether USD', decimalPlaces: 6 }]);
    await seedLedgerAccounts([account(`POS-${currency}01`, 'a3000000-0000-4000-8000-000000000001', { currency, decimalPlaces, ...seed })]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

    await page.goto(`${baseURL}/`);

    const position = panel(page, 'Position by currency');
    expect(await tableCell(position, currency, 'Balance')).toBe(balance);
    expect(await tableCell(position, currency, 'Available')).toBe(available);
    expect(await tableCell(position, currency, 'Held')).toBe(held);
  });
}
