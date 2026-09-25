/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: Accounts opened per month are split by status
 *     Given today is 2026-09-24
 *     And 4 accounts were opened in September 2026, 3 now active and 1 now closed
 *     And 2 accounts were opened in August 2026, both now active
 *     When the operator Mai opens the Overview screen
 *     Then the accounts-opened chart shows the 12 months from October 2025 to September 2026
 *     And September shows 3 active and 1 closed, and August shows 2 active
 *
 * Each month is the account status count for that month's window (§3a: the service windows it on
 * the date each account was opened). One August account was opened at 23:30 UTC on 31 August —
 * already 1 September in Singapore — and the browser runs on Singapore time, so only a month
 * counted in UTC (R4) puts it in August (spec gate round 2 nit: a month-boundary example). One
 * account opened in September 2025 falls outside the 12 months. RED today: `/` draws no chart.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { seedLedgerAccounts, setLedgerClock } from '../support/ledger';
import { panel, rowLabels, tableCell } from '../support/overview';
import { account } from '../support/records';
import { signInAs } from '../support/sign-in';

test.use({ timezoneId: 'Asia/Singapore' });

const MONTHS = [
  'October 2025', 'November 2025', 'December 2025', 'January 2026', 'February 2026', 'March 2026',
  'April 2026', 'May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026',
];

test('Accounts opened per month are split by status', async ({ page, baseURL }) => {
  await setLedgerClock('2026-09-24');
  const opened = (n: number, openedOn: string, status: 'Active' | 'Closed') =>
    account(`OPEN-${String(n).padStart(6, '0')}`, `a6000000-0000-4000-8000-${String(n).padStart(12, '0')}`, { openedOn, status, balance: '0.00', availableBalance: '0.00' });
  await seedLedgerAccounts([
    opened(1, '2026-09-01T00:30:00.000Z', 'Active'),
    opened(2, '2026-09-10T08:00:00.000Z', 'Active'),
    opened(3, '2026-09-24T09:00:00.000Z', 'Active'),
    opened(4, '2026-09-15T12:00:00.000Z', 'Closed'),
    opened(5, '2026-08-05T08:00:00.000Z', 'Active'),
    opened(6, '2026-08-31T23:30:00.000Z', 'Active'),
    opened(7, '2025-09-30T12:00:00.000Z', 'Active'),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.clock.setFixedTime(new Date('2026-09-24T10:00:00Z'));

  await page.goto(`${baseURL}/`);

  const chart = panel(page, 'Accounts opened per month');
  expect(await rowLabels(chart)).toEqual(MONTHS);
  expect(await tableCell(chart, 'September 2026', 'Active')).toBe('3');
  expect(await tableCell(chart, 'September 2026', 'Closed')).toBe('1');
  expect(await tableCell(chart, 'September 2026', 'Frozen')).toBe('0');
  expect(await tableCell(chart, 'September 2026', 'Dormant')).toBe('0');
  expect(await tableCell(chart, 'August 2026', 'Active')).toBe('2');
  expect(await tableCell(chart, 'August 2026', 'Closed')).toBe('0');
  expect(await tableCell(chart, 'October 2025', 'Active')).toBe('0');
});
