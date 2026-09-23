/**
 * DRK-1696 §5:
 *   Scenario Outline: Every status the service supports can be set
 *     Given the account ACME-000123 is active and holds 0.00 SGD
 *     When the operator Mai sets it to <status>
 *     Then the account is <status>
 *
 *     Examples: frozen | dormant | closed
 *
 * All four statuses are offered (decision log, `2026-09-24 · drunkcoding · All 4 account
 * statuses are offered, not only the 2 that close and reopen`) — not only via the
 * close/reopen control. RED today: no `/accounts/{account}` route exists yet.
 */
import { expect, test } from '@playwright/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

for (const status of ['Frozen', 'Dormant', 'Closed']) {
  test(`Every status the service supports can be set — ${status}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([
      { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '0.00', availableBalance: '0.00', heldAmount: '0.00', permittedToGoNegative: false },
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

    await page.goto(`${baseURL}/accounts/ACME-000123`);
    await page.getByLabel('Status').selectOption(status);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(status)).toBeVisible();
  });
}
