/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: Status counts show every status, including an empty one
 *     Given the ledger holds 1,200 active, 2 frozen, 0 dormant and 1 closed accounts
 *     And it holds 4 active and 0 closed groups
 *     When the operator Mai opens the Overview screen
 *     Then she sees accounts Active 1,200, Frozen 2, Dormant 0 and Closed 1
 *     And she sees groups Active 4 and Closed 0
 *
 * The counts are the service's status counts (§3a), which spell each status upper-case and send
 * a zero for a status nothing holds; the stand-in ledger does the same, and refuses any narrowing
 * but `from`/`to` exactly as the service does (R3). RED today: `/` draws no status counts.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccountGroups, seedLedgerAccounts } from '../support/ledger';
import { panel, rowLabels, tableCell } from '../support/overview';
import { account } from '../support/records';
import { signInAs } from '../support/sign-in';

const STATUSES: Array<{ status: 'Active' | 'Frozen' | 'Closed'; count: number }> = [
  { status: 'Active', count: 1200 },
  { status: 'Frozen', count: 2 },
  { status: 'Closed', count: 1 },
];

test('Status counts show every status, including an empty one', async ({ page, baseURL }) => {
  let n = 0;
  await seedLedgerAccounts(
    STATUSES.flatMap(({ status, count }) =>
      Array.from({ length: count }, () => {
        n += 1;
        return account(`STAT-${String(n).padStart(6, '0')}`, `a5000000-0000-4000-8000-${String(n).padStart(12, '0')}`, { status, balance: '0.00', availableBalance: '0.00' });
      }),
    ),
  );
  await seedLedgerAccountGroups(
    Array.from({ length: 4 }, (_, i) => ({ id: `c3000000-0000-4000-8000-00000000000${i + 1}`, code: `GRP${i + 1}`, name: `Group ${i + 1}`, type: 'Customer', ownerId: 'ops' })),
  );
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/`);

  const accounts = panel(page, 'Accounts by status');
  expect(await rowLabels(accounts)).toEqual(['Active', 'Frozen', 'Dormant', 'Closed']);
  expect(await tableCell(accounts, 'Active', null)).toBe('1,200');
  expect(await tableCell(accounts, 'Frozen', null)).toBe('2');
  expect(await tableCell(accounts, 'Dormant', null)).toBe('0');
  expect(await tableCell(accounts, 'Closed', null)).toBe('1');

  const groups = panel(page, 'Groups by status');
  expect(await rowLabels(groups)).toEqual(['Active', 'Closed']);
  expect(await tableCell(groups, 'Active', null)).toBe('4');
  expect(await tableCell(groups, 'Closed', null)).toBe('0');

  const paths = (await ledgerRequests()).filter((r) => r.method === 'GET').map((r) => r.path);
  expect(paths.some((path) => path === '/v1/accounts/status-counts' || path.startsWith('/v1/accounts/status-counts?'))).toBe(true);
  expect(paths.some((path) => path === '/v1/account-groups/status-counts' || path.startsWith('/v1/account-groups/status-counts?'))).toBe(true);
  // Nothing on Overview lists accounts or groups to count them in the browser (R1).
  expect(paths.filter((path) => path.startsWith('/v1/accounts?') || path.startsWith('/v1/account-groups?'))).toEqual([]);
});
