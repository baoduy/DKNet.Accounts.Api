/**
 * DRK-1725 §5:
 *   @integration
 *   Scenario: Postings per week are the service's counts
 *     Given today is 2026-09-24
 *     And 1,250 postings took effect from 2026-09-18 to 2026-09-24, and 3 from 2026-09-11 to 2026-09-17
 *     When the operator Mai opens the Overview screen
 *     Then the postings chart shows 13 weeks
 *     And the latest week shows 1,250 and the week before shows 3
 *
 * A week is 7 days and the latest ends today (§3 Activity). Each week is one posting-list read of
 * that window asking for a page of 1, so 1,250 can only come from the service's `totalItemCount`
 * (R1). The browser's clock and the stand-in ledger's clock both read 2026-09-24. RED today: `/`
 * draws no postings chart.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts, seedLedgerPostings, setLedgerClock } from '../support/ledger';
import { panel, rowLabels, tableCell } from '../support/overview';
import { ACME_ID, account, posting } from '../support/records';
import { signInAs } from '../support/sign-in';

const WEEKS = [
  ['2026-06-26', '2026-07-02'],
  ['2026-07-03', '2026-07-09'],
  ['2026-07-10', '2026-07-16'],
  ['2026-07-17', '2026-07-23'],
  ['2026-07-24', '2026-07-30'],
  ['2026-07-31', '2026-08-06'],
  ['2026-08-07', '2026-08-13'],
  ['2026-08-14', '2026-08-20'],
  ['2026-08-21', '2026-08-27'],
  ['2026-08-28', '2026-09-03'],
  ['2026-09-04', '2026-09-10'],
  ['2026-09-11', '2026-09-17'],
  ['2026-09-18', '2026-09-24'],
];

const LATEST_WEEK_DAYS = ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'];

test("Postings per week are the service's counts", async ({ page, baseURL }) => {
  await setLedgerClock('2026-09-24');
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await seedLedgerPostings([
    ...Array.from({ length: 1250 }, (_, i) =>
      posting({ id: `b1000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, postingNumber: `P-${20000 + i}`, accountId: ACME_ID, direction: 'Credit', amount: '1.00', currency: 'SGD', category: 'Transfer', effectiveDate: LATEST_WEEK_DAYS[i % 7] }),
    ),
    ...['2026-09-11', '2026-09-14', '2026-09-17'].map((effectiveDate, i) =>
      posting({ id: `b2000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, postingNumber: `P-${30000 + i}`, accountId: ACME_ID, direction: 'Credit', amount: '1.00', currency: 'SGD', category: 'Transfer', effectiveDate }),
    ),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
  await page.clock.setFixedTime(new Date('2026-09-24T10:00:00Z'));

  await page.goto(`${baseURL}/`);

  const chart = panel(page, 'Postings per week');
  expect(await rowLabels(chart)).toEqual(WEEKS.map(([from, to]) => `${from} to ${to}`));
  expect(await tableCell(chart, '2026-09-18 to 2026-09-24', null)).toBe('1,250');
  expect(await tableCell(chart, '2026-09-11 to 2026-09-17', null)).toBe('3');
  expect(await tableCell(chart, '2026-09-04 to 2026-09-10', null)).toBe('0');

  const reads = (await ledgerRequests())
    .filter((r) => r.method === 'GET' && r.path.startsWith('/v1/postings?'))
    .map((r) => new URLSearchParams(r.path.split('?')[1]));
  expect(reads.map((params) => [params.get('from'), params.get('to')])).toEqual(expect.arrayContaining(WEEKS));
  expect(reads.every((params) => params.get('pageSize') === '1')).toBe(true);
});
