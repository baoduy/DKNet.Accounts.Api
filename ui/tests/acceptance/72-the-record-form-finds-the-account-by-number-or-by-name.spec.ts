/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: The record form finds the account by number or by name
 *     Given the ledger holds the account ACME-000123, named "Acme Operating"
 *     When the operator Mai searches for "<term>" on the Records screen's record form
 *     Then she is offered ACME-000123 to choose
 *
 *     Examples:
 *       | term           |
 *       | ACME-000123    |
 *       | Acme Operating |
 *
 * A second account the term does not name is seeded so the offer is the search's, not a list
 * of every account. RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts } from '../support/ledger';
import { ACME_ID, GLOBEX_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

for (const term of ['ACME-000123', 'Acme Operating']) {
  test(`The record form finds the account by number or by name — ${term}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID, { name: 'Acme Operating' }), account('GLOBEX-000456', GLOBEX_ID, { name: 'Globex Treasury' })]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}/records`);

    await page.getByRole('button', { name: 'Record posting', exact: true }).click();
    await page.getByLabel('Account', { exact: true }).fill(term);

    await expect(page.getByRole('option', { name: /^ACME-000123\b/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /^GLOBEX-000456\b/ })).toHaveCount(0);
    const searched = (await ledgerRequests()).filter((r) => r.method === 'GET' && r.path.startsWith('/v1/accounts?') && new URLSearchParams(r.path.split('?')[1]).get('search') === term);
    expect(searched.length).toBeGreaterThanOrEqual(1);
  });
}
