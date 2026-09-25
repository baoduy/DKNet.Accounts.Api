/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: The position is the service's total, not a sum of a page
 *     Given the ledger holds 1,500 SGD accounts of 1,000.00 SGD each
 *     When the operator Mai opens the Overview screen
 *     Then the SGD row shows a balance of 1,500,000.00 SGD
 *
 * The service answers at most 1,000 accounts a page, so a sum of the listed accounts could reach
 * 1,000,000.00 at most (R1). RED today: `/` draws no position.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts } from '../support/ledger';
import { panel, tableCell } from '../support/overview';
import { account } from '../support/records';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme("The position is the service's total, not a sum of a page", async ({ page, baseURL }) => {
  await seedLedgerAccounts(
    Array.from({ length: 1500 }, (_, i) => {
      const n = String(i + 1).padStart(6, '0');
      return account(`BULK-${n}`, `a4000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, { balance: '1000.00', availableBalance: '1000.00', heldAmount: '0.00' });
    }),
  );
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/`);

  expect(await tableCell(panel(page, 'Position by currency'), 'SGD', 'Balance')).toBe('1,500,000.00');
  const paths = (await ledgerRequests()).filter((r) => r.method === 'GET').map((r) => r.path);
  expect(paths).toContain('/v1/accounts/balances');
  expect(paths.filter((path) => path.startsWith('/v1/accounts?'))).toEqual([]);
});
