/**
 * DRK-2325 §5:
 *   @unit Scenario Outline: The detail panel shows every field and the postings
 *     Given "Alice SGD" sent 100.00 SGD to "Bob USD" at 0.74 with a fee of <fee> SGD, under the key "payroll-oct-001", from PayHub
 *     When Mai opens that transfer
 *     Then the panel shows its id, ACME-000101, ACME-000201, 100.00 SGD, USD, 0.74, <fee> SGD, <fee account>, <converted> USD, its recorded time, PayHub and "payroll-oct-001"
 *     And it lists <count> postings, each with its posting number, account, direction, category and amount
 *
 * Times are drawn in UTC: the machine runs on Singapore time here, so a local-time drawing fails.
 * The transfer is opened from its row; the panel is the screen's side panel ("Details"). Each
 * posting is checked on its own line — the table row or list item that holds its posting number.
 *
 * RED today: `TransfersScreen` is a stub that throws (brief §3 row 6).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { answer, chooseAccount, ID, OPTION, paged, panel, posting, renderScreen, resetScreen, rowCells, setNow, stubLedger, transferRow, type PostingFields } from './transfers.fixture';

vi.mock('next/navigation', async () => {
  const fixture = await import('./transfers.fixture');
  return { useSearchParams: () => new URLSearchParams(fixture.address.search), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/transfers' };
});

const TRANSFER_ID = 'c0000000-0000-4000-8000-000000000001';

const ORIGINAL_TZ = process.env.TZ;

// Singapore's calendar and clock on the machine, so a time drawn in local time (17:30) rather than
// UTC (09:30) fails here wherever the suite runs.
beforeEach(() => {
  process.env.TZ = 'Asia/Singapore';
  setNow();
  expect(new Date('2026-10-19T09:30:00Z').getHours()).toBe(17);
});
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
  resetScreen();
});

describe('The detail panel shows every field and the postings', () => {
  it.each([
    {
      fee: '2.00',
      feeAccount: ID.feesSgd as string | null,
      converted: '72.52',
      postings: [
        { postingNumber: 'PST-0000000101', account: ID.alice, direction: 'debit', category: 'transfer', amount: '98.00', currency: 'SGD' },
        { postingNumber: 'PST-0000000102', account: ID.bobUsd, direction: 'credit', category: 'transfer', amount: '72.52', currency: 'USD' },
        { postingNumber: 'PST-0000000103', account: ID.alice, direction: 'debit', category: 'fee', amount: '2.00', currency: 'SGD' },
        { postingNumber: 'PST-0000000104', account: ID.feesSgd, direction: 'credit', category: 'fee', amount: '2.00', currency: 'SGD' },
      ] as PostingFields[],
      lines: [
        ['PST-0000000101', 'ACME-000101', 'Debit', 'Transfer', '98.00'],
        ['PST-0000000102', 'ACME-000201', 'Credit', 'Transfer', '72.52'],
        ['PST-0000000103', 'ACME-000101', 'Debit', 'Fee', '2.00'],
        ['PST-0000000104', 'ACME-000103', 'Credit', 'Fee', '2.00'],
      ],
    },
    {
      fee: '0.00',
      feeAccount: null,
      converted: '74.00',
      postings: [
        { postingNumber: 'PST-0000000101', account: ID.alice, direction: 'debit', category: 'transfer', amount: '100.00', currency: 'SGD' },
        { postingNumber: 'PST-0000000102', account: ID.bobUsd, direction: 'credit', category: 'transfer', amount: '74.00', currency: 'USD' },
      ] as PostingFields[],
      lines: [
        ['PST-0000000101', 'ACME-000101', 'Debit', 'Transfer', '100.00'],
        ['PST-0000000102', 'ACME-000201', 'Credit', 'Transfer', '74.00'],
      ],
    },
  ])('with a fee of $fee SGD: every field, then $lines.length postings', async ({ fee, feeAccount, converted, postings, lines }) => {
    const row = transferRow({ id: TRANSFER_ID, fee, feeAccount, converted });
    const ledger = stubLedger({
      transfers: () => answer(paged([row])),
      transfer: (id) => (id === TRANSFER_ID ? answer({ ...row, postings: postings.map(posting) }) : answer({ status: 404, errors: [{ message: 'Not found.' }] }, 404)),
    });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');

    await userEvent.click(screen.getByRole('cell', { name: '2026-10-19 09:30' }));

    await waitFor(() => expect(panel()).toHaveTextContent('PST-0000000101'));
    const details = panel();

    expect(within(details).getAllByText(/^PST-\d{10}$/)).toHaveLength(lines.length);
    for (const [postingNumber, ...values] of lines) {
      const line = within(details).getByText(postingNumber).closest('tr, li')!;
      expect(line).not.toBeNull();
      for (const value of values) expect(line).toHaveTextContent(value);
    }

    // The transfer's own fields, read with the posting lines taken out — a posting's account or
    // amount never stands in for a field the panel left out.
    const fields = details.cloneNode(true) as HTMLElement;
    for (const line of [...fields.querySelectorAll('tr, li')].filter((candidate) => /PST-\d{10}/.test(candidate.textContent ?? ''))) line.remove();
    for (const shown of [TRANSFER_ID, 'ACME-000101', 'ACME-000201', '100.00 SGD', 'USD', '0.74', `${fee} SGD`, `${converted} USD`, '2026-10-19 09:30', 'PayHub', 'payroll-oct-001']) {
      expect(fields).toHaveTextContent(shown);
    }
    if (feeAccount) {
      expect(fields).toHaveTextContent('ACME-000103');
    } else {
      expect(fields).not.toHaveTextContent('ACME-000103');
    }
    expect(ledger.calls.some((call) => call.method === 'GET' && call.url === `/api/ledger/transfers/${TRANSFER_ID}`)).toBe(true);
  });
});
