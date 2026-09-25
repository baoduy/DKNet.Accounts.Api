/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: A chart the operator has no permission for says so
 *     Given the operator Nam may read accounts but not postings
 *     When he opens the Overview screen
 *     Then the postings chart says it needs the postings read permission
 *     And the position, the status counts and the accounts-opened chart show their figures
 *
 * RED today: `/` draws none of these panels.
 */
import { expect, test } from '../support/test';
import { NAM } from '../support/fixtures';
import { seedLedgerAccountGroups, seedLedgerAccounts, setLedgerClock } from '../support/ledger';
import { panel, tableCell } from '../support/overview';
import { ACME_ID, account } from '../support/records';
import { signInAs } from '../support/sign-in';

// DRK-1745: rewrite for the new form
test.fixme('A chart the operator has no permission for says so', async ({ page, baseURL }) => {
  await setLedgerClock('2026-09-24');
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { balance: '100.00', availableBalance: '100.00', openedOn: '2026-09-10T08:00:00.000Z' })]);
  await seedLedgerAccountGroups([{ id: 'c4000000-0000-4000-8000-000000000001', code: 'ACME', name: 'Acme Corporation', type: 'Customer', ownerId: 'ops' }]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: NAM.email });
  await page.clock.setFixedTime(new Date('2026-09-24T10:00:00Z'));

  await page.goto(`${baseURL}/`);

  const postings = panel(page, 'Postings per week');
  await expect(postings.getByText('requires postings.read', { exact: true })).toBeVisible();
  await expect(postings.getByRole('table')).toHaveCount(0);

  expect(await tableCell(panel(page, 'Position by currency'), 'SGD', 'Balance')).toBe('100.00');
  expect(await tableCell(panel(page, 'Accounts by status'), 'Active', null)).toBe('1');
  expect(await tableCell(panel(page, 'Groups by status'), 'Active', null)).toBe('1');
  expect(await tableCell(panel(page, 'Accounts opened per month'), 'September 2026', 'Active')).toBe('1');
  for (const name of ['Position by currency', 'Accounts by status', 'Groups by status', 'Accounts opened per month'] as const) {
    await expect(panel(page, name).getByText(/^requires /)).toHaveCount(0);
  }
});
