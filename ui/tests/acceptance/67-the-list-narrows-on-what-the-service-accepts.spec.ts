/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: The list narrows on what the service accepts
 *     Given the ledger holds 5 postings effective on 2026-09-01: 3 credits and 2 debits
 *     And 1 of them is a fee, and 1 credit was reversed by 1 of the debits
 *     When the operator Mai narrows the September 2026 list to <narrowing>
 *     Then she sees <count> postings
 *
 *     Examples:
 *       | narrowing         | count |
 *       | direction Debit   | 2     |
 *       | category Fee      | 1     |
 *       | status Reversed   | 1     |
 *
 * DRK-1713 "Controlled clock": the reversing debit is written by the fake ledger's own reverse
 * route under a clock set to 2026-09-01 — the service dates a reversal on the day it is
 * written, so a seeded reversal could not show that. RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { FAKE_LEDGER_BASE, MAI } from '../support/fixtures';
import { ledgerPostings, seedLedgerAccounts, seedLedgerPostings, setLedgerClock } from '../support/ledger';
import { ACME_ID, GLOBEX_ID, account, posting, recordRows, setPeriod } from '../support/records';
import { signInAs } from '../support/sign-in';

const REVERSED_CREDIT_ID = 'b0000000-0000-4000-8000-000000010003';

const EXAMPLES: Array<{ narrowing: string; label: string; value: string; count: number }> = [
  { narrowing: 'direction Debit', label: 'Direction filter', value: 'Debit', count: 2 },
  { narrowing: 'category Fee', label: 'Category filter', value: 'Fee', count: 1 },
  { narrowing: 'status Reversed', label: 'Status filter', value: 'Reversed', count: 1 },
];

for (const { narrowing, label, value, count } of EXAMPLES) {
  test(`The list narrows on what the service accepts — ${narrowing}`, async ({ page, baseURL }) => {
    await setLedgerClock('2026-09-01');
    await seedLedgerAccounts([account('ACME-000123', ACME_ID), account('GLOBEX-000456', GLOBEX_ID)]);
    await seedLedgerPostings([
      posting({ id: 'b0000000-0000-4000-8000-000000010001', postingNumber: 'P-10001', accountId: ACME_ID, direction: 'Credit', amount: '10.00', currency: 'SGD', category: 'Transfer', effectiveDate: '2026-09-01' }),
      posting({ id: 'b0000000-0000-4000-8000-000000010002', postingNumber: 'P-10002', accountId: GLOBEX_ID, direction: 'Credit', amount: '20.00', currency: 'SGD', category: 'Payment', effectiveDate: '2026-09-01' }),
      posting({ id: REVERSED_CREDIT_ID, postingNumber: 'P-10003', accountId: ACME_ID, direction: 'Credit', amount: '30.00', currency: 'SGD', category: 'Transfer', effectiveDate: '2026-09-01' }),
      posting({ id: 'b0000000-0000-4000-8000-000000010004', postingNumber: 'P-10004', accountId: GLOBEX_ID, direction: 'Debit', amount: '1.50', currency: 'SGD', category: 'Fee', effectiveDate: '2026-09-01' }),
    ]);
    const reversal = await fetch(`${FAKE_LEDGER_BASE}/v1/postings/${REVERSED_CREDIT_ID}/reverse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'narrowing-fixture-reversal' },
      body: JSON.stringify({ reason: 'entered twice' }),
    });
    expect(reversal.status).toBe(200);
    // The fixture itself: 5 postings, the reversing debit dated by the clock.
    const held = await ledgerPostings();
    expect(held).toHaveLength(5);
    expect(held.find((p) => p.reversesPostingId === REVERSED_CREDIT_ID)?.effectiveDate).toBe('2026-09-01');

    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });
    await page.goto(`${baseURL}/records`);
    await setPeriod(page, '2026-09-01', '2026-09-30');
    await expect(recordRows(page)).toHaveCount(5);

    await page.getByLabel(label, { exact: true }).selectOption(value);

    await expect(recordRows(page)).toHaveCount(count);
  });
}
