/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: Overview works in full with the read permissions only
 *     Given the operator Lan may read accounts and postings, and may change nothing
 *     When she opens the Overview screen
 *     Then every panel shows its figures and none says a permission is missing
 *     And Overview offers no action that records, changes or deletes anything
 *
 * Lan holds `accounts.read` and `postings.read` only. "Every panel" is the 5 figure panels; the
 * recently viewed panel holds no record yet. RED today: `/` draws none of these panels.
 */
import { expect, test } from '../support/test';
import { LAN } from '../support/fixtures';
import { seedLedgerAccountGroups, seedLedgerAccounts, seedLedgerPostings, setLedgerClock } from '../support/ledger';
import { panel, tableCell } from '../support/overview';
import { ACME_ID, account, posting } from '../support/records';
import { signInAs } from '../support/sign-in';

const WRITE_ACTION = /record|revers|open (an )?account|create|new |add|edit|change|rename|delete|remove|close|reopen|activate|save|submit/i;

test('Overview works in full with the read permissions only', async ({ page, baseURL }) => {
  await setLedgerClock('2026-09-24');
  await seedLedgerAccounts([account('ACME-000123', ACME_ID, { balance: '100.00', availableBalance: '100.00', openedOn: '2026-09-10T08:00:00.000Z' })]);
  await seedLedgerAccountGroups([{ id: 'c5000000-0000-4000-8000-000000000001', code: 'ACME', name: 'Acme Corporation', type: 'Customer', ownerId: 'ops' }]);
  await seedLedgerPostings([
    posting({ id: 'b4000000-0000-4000-8000-000000000001', postingNumber: 'P-10042', accountId: ACME_ID, direction: 'Credit', amount: '100.00', currency: 'SGD', category: 'Transfer', effectiveDate: '2026-09-20' }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: LAN.email });
  await page.clock.setFixedTime(new Date('2026-09-24T10:00:00Z'));

  await page.goto(`${baseURL}/`);

  expect(await tableCell(panel(page, 'Position by currency'), 'SGD', 'Balance')).toBe('100.00');
  expect(await tableCell(panel(page, 'Accounts by status'), 'Active', null)).toBe('1');
  expect(await tableCell(panel(page, 'Groups by status'), 'Active', null)).toBe('1');
  expect(await tableCell(panel(page, 'Postings per week'), '2026-09-18 to 2026-09-24', null)).toBe('1');
  expect(await tableCell(panel(page, 'Accounts opened per month'), 'September 2026', 'Active')).toBe('1');

  const main = page.getByRole('main');
  await expect(main.getByText(/requires (accounts|postings)\./)).toHaveCount(0);
  await expect(main.getByRole('button', { name: WRITE_ACTION })).toHaveCount(0);
  await expect(main.getByRole('link', { name: WRITE_ACTION })).toHaveCount(0);
});
