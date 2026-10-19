/**
 * DRK-2325 §5 — the @unit scenarios of the Transfers screen's account select and list, driven
 * through `TransfersScreen` with the pass-through (`fetch`) stubbed (`transfers.fixture.ts`), the
 * way `components/records/RecordsScreen.test.tsx` drives its screen:
 *
 *   Scenario: The account select lists accounts by number and name
 *   Scenario: No transfers are read before an account is chosen
 *   Scenario Outline: The list shows a transfer on any side of the chosen account
 *   Scenario Outline: A row shows each amount at its own currency's places and accounts by number
 *   Scenario: A same-currency transfer shows no rate
 *   Scenario: The Period choice offers 3 windows and opens on Last 1 year
 *   Scenario Outline: Each period reads its own window of UTC dates
 *   Scenario: Last 1 year on a leap day is not refused
 *   Scenario Outline: Search passes a term of 2 characters or more
 *   Scenario Outline: Sorting by a column
 *   Scenario: The source, destination and rate columns cannot be sorted
 *   Scenario: The pager opens at 10 rows with 4 sizes
 *   Scenario Outline: A copied page address reopens the same view
 *   Scenario Outline: A refused read is stated where it happened
 *   Scenario: An amount shows exactly as the ledger sent it
 *
 * Controls are found by the names the spec gives them: the account select "Account", the columns
 * "Recorded at", "Source", "Destination", "Amount", "Converted amount", "Rate" and "Fee", the
 * filter menu's "Period", the pager's "Rows per page". A read is checked by the query the screen
 * sent the list (`from`, `to`, `search`, `orderBy`, `desc`, `pageNumber`, `pageSize` — the
 * service's own parameters); `orderBy` is compared without case, as the service resolves it.
 *
 * The machine runs on Singapore time throughout, so a date or time worked out in local time
 * rather than UTC fails wherever the suite runs.
 *
 * RED today: `TransfersScreen` is a stub that throws (brief §3 row 6).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accountSelect,
  address,
  answer,
  chooseAccount,
  ID,
  ledgerAccounts,
  OPTION,
  paged,
  panel,
  refused,
  renderScreen,
  resetScreen,
  rowCells,
  setNow,
  settle,
  stubLedger,
  transferRow,
} from './transfers.fixture';

vi.mock('next/navigation', async () => {
  const fixture = await import('./transfers.fixture');
  return { useSearchParams: () => new URLSearchParams(fixture.address.search), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/transfers' };
});

/** Alice's default list: the spec's 100.00 SGD to "Bob USD", recorded 2026-10-19 09:30 UTC. */
const ALICE_TO_BOB_USD = transferRow();

function aliceList(): ReturnType<typeof answer> {
  return answer(paged([ALICE_TO_BOB_USD]));
}

const ORIGINAL_TZ = process.env.TZ;

// Singapore's calendar and clock on the machine, so a time or date worked out in local time rather
// than UTC fails here wherever the suite runs.
beforeEach(() => {
  process.env.TZ = 'Asia/Singapore';
  setNow();
  expect(new Date('2026-10-19T09:30:00Z').getHours()).toBe(17);
});
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
  resetScreen();
});

describe('The account select lists accounts by number and name', () => {
  it('offers "ACME-000101 — Alice SGD" and asks the ledger for up to 1000 accounts', async () => {
    const ledger = stubLedger();
    renderScreen();

    expect(await screen.findByRole('option', { name: OPTION.alice })).toBeInTheDocument();
    expect(within(accountSelect()).getByRole('option', { name: OPTION.keiJpy })).toBeInTheDocument();
    expect(ledger.accountListReads().map((params) => params.get('pageSize'))).toContain('1000');
  });
});

describe('No transfers are read before an account is chosen', () => {
  it('says "Choose an account to see its transfers." and reads no transfer list', async () => {
    const ledger = stubLedger({ transfers: aliceList });
    renderScreen();

    await screen.findByRole('option', { name: OPTION.alice });
    expect(await screen.findByText('Choose an account to see its transfers.')).toBeInTheDocument();
    await settle();
    expect(ledger.listReads()).toEqual([]);
  });
});

describe('The list shows a transfer on any side of the chosen account', () => {
  it.each([
    { side: 'source', row: transferRow({ source: ID.feesSgd, destination: ID.bobSgd, destinationCurrency: 'SGD', rate: null, fee: '0.00', feeAccount: null, amount: '10.00', converted: '10.00' }), source: 'ACME-000103', destination: 'ACME-000102' },
    { side: 'destination', row: transferRow({ source: ID.alice, destination: ID.feesSgd, destinationCurrency: 'SGD', rate: null, fee: '0.00', feeAccount: null, amount: '20.00', converted: '20.00' }), source: 'ACME-000101', destination: 'ACME-000103' },
    { side: 'fee account', row: transferRow(), source: 'ACME-000101', destination: 'ACME-000201' },
  ])('"Fees SGD" as the $side: the table shows that transfer', async ({ row, source, destination }) => {
    const ledger = stubLedger({ transfers: (accountId) => (accountId === ID.feesSgd ? answer(paged([row])) : answer(paged([]))) });
    renderScreen();

    await chooseAccount(OPTION.feesSgd);

    const cells = await rowCells('2026-10-19 09:30');
    expect(cells[1]).toBe(source);
    expect(cells[2]).toBe(destination);
    expect(ledger.listReads(ID.feesSgd).length).toBeGreaterThan(0);
  });
});

describe("A row shows each amount at its own currency's places and accounts by number", () => {
  it.each([
    { destination: 'Bob USD', row: transferRow(), expected: ['2026-10-19 09:30', 'ACME-000101', 'ACME-000201', '100.00 SGD', '72.52 USD', '0.74', '2.00 SGD'] },
    {
      destination: 'Kei JPY',
      row: transferRow({ destination: ID.keiJpy, destinationCurrency: 'JPY', rate: '113.55', converted: '11128' }),
      expected: ['2026-10-19 09:30', 'ACME-000101', 'ACME-000301', '100.00 SGD', '11,128 JPY', '113.55', '2.00 SGD'],
    },
  ])('to "$destination": the row shows $expected', async ({ row, expected }) => {
    stubLedger({ transfers: () => answer(paged([row])) });
    renderScreen();

    await chooseAccount(OPTION.alice);

    expect(await rowCells('2026-10-19 09:30')).toEqual(expected);
  });
});

describe('A same-currency transfer shows no rate', () => {
  it('shows "—" for the rate of 50.00 SGD from "Alice SGD" to "Bob SGD"', async () => {
    const row = transferRow({ destination: ID.bobSgd, destinationCurrency: 'SGD', amount: '50.00', rate: null, fee: '0.00', feeAccount: null, converted: '50.00' });
    stubLedger({ transfers: () => answer(paged([row])) });
    renderScreen();

    await chooseAccount(OPTION.alice);

    expect(await rowCells('2026-10-19 09:30')).toEqual(['2026-10-19 09:30', 'ACME-000101', 'ACME-000102', '50.00 SGD', '50.00 SGD', '—', '0.00 SGD']);
  });
});

async function openFilterMenu(): Promise<ReturnType<typeof within>> {
  await userEvent.click(screen.getByRole('button', { name: /^Filter/ }));
  return within(screen.getByRole('group', { name: 'Filters' }));
}

describe('The Period choice offers 3 windows and opens on Last 1 year', () => {
  it('offers Last 30 days, Last 90 days and Last 1 year, with Last 1 year chosen', async () => {
    stubLedger();
    renderScreen();
    await screen.findByRole('option', { name: OPTION.alice });

    const menu = await openFilterMenu();
    const period = menu.getByLabelText('Period') as HTMLSelectElement;

    expect(within(period).getAllByRole('option').map((option) => option.textContent)).toEqual(['Last 30 days', 'Last 90 days', 'Last 1 year']);
    expect(period.selectedOptions[0].textContent).toBe('Last 1 year');
  });
});

describe('Each period reads its own window of UTC dates', () => {
  it.each([
    { now: '2026-10-19T10:00:00Z', period: 'Last 30 days', from: '2026-09-19', to: '2026-10-19' },
    { now: '2026-10-19T10:00:00Z', period: 'Last 90 days', from: '2026-07-21', to: '2026-10-19' },
    { now: '2026-10-19T10:00:00Z', period: 'Last 1 year', from: null, to: null },
  ])('at $now, $period reads from $from to $to', async ({ now, period, from, to }) => {
    setNow(now);
    const ledger = stubLedger({ transfers: aliceList });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');

    const menu = await openFilterMenu();
    await userEvent.selectOptions(menu.getByLabelText('Period'), period);
    await settle();

    const read = ledger.listReads(ID.alice).at(-1)!;
    expect(read.get('from')).toBe(from);
    expect(read.get('to')).toBe(to);
  });

  it('at 2026-10-19 23:30 UTC, which is 2026-10-20 in Singapore, Last 30 days reads from 2026-09-19 to 2026-10-19', async () => {
    setNow('2026-10-19T23:30:00Z');
    // The machine's own calendar is Singapore's here, or this row would prove nothing.
    expect(new Date().getDate()).toBe(20);
    const ledger = stubLedger({ transfers: aliceList });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');

    const menu = await openFilterMenu();
    await userEvent.selectOptions(menu.getByLabelText('Period'), 'Last 30 days');
    await settle();

    const read = ledger.listReads(ID.alice).at(-1)!;
    expect(read.get('from')).toBe('2026-09-19');
    expect(read.get('to')).toBe('2026-10-19');
  });
});

describe('Last 1 year on a leap day is not refused', () => {
  it("at 2028-02-29 10:00 UTC, reads the list's own default window and shows Alice's transfers with no refusal", async () => {
    setNow('2028-02-29T10:00:00Z');
    const ledger = stubLedger({ transfers: () => answer(paged([transferRow({ recordedAt: '2028-02-29T08:15:00+00:00' })])) });
    renderScreen();

    await chooseAccount(OPTION.alice);

    expect(await rowCells('2028-02-29 08:15')).toEqual(['2028-02-29 08:15', 'ACME-000101', 'ACME-000201', '100.00 SGD', '72.52 USD', '0.74', '2.00 SGD']);
    const read = ledger.listReads(ID.alice).at(-1)!;
    expect(read.has('from')).toBe(false);
    expect(read.has('to')).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Search passes a term of 2 characters or more', () => {
  /** Alice's whole list, or what the list matches for a term: the key "payroll-oct-001" for
   * "pa", the calling system "PayHub" for "Pa". */
  function searchable(_accountId: string, params: URLSearchParams): ReturnType<typeof answer> {
    const search = params.get('search');
    if (search === 'pa') return answer(paged([transferRow({ amount: '11.00', recordedAt: '2026-10-18T08:00:00+00:00', idempotencyKey: 'payroll-oct-001', callingSystem: 'Treasury' })]));
    if (search === 'Pa') return answer(paged([transferRow({ amount: '12.00', recordedAt: '2026-10-17T08:00:00+00:00', idempotencyKey: 'rent-oct', callingSystem: 'PayHub' })]));
    return answer(paged([ALICE_TO_BOB_USD, transferRow({ id: 'c0000000-0000-4000-8000-000000000002', amount: '13.00', recordedAt: '2026-10-16T08:00:00+00:00', idempotencyKey: 'misc', callingSystem: 'Ops' })]));
  }

  async function searchFor(term: string): Promise<void> {
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');
    await userEvent.type(screen.getByRole('searchbox'), term);
    await settle();
  }

  it('"pa": the table shows the transfer the list matches, key "payroll-oct-001"', async () => {
    const ledger = stubLedger({ transfers: searchable });
    renderScreen();

    await searchFor('pa');

    expect((await rowCells('2026-10-18 08:00'))[3]).toBe('11.00 SGD');
    expect(screen.queryByRole('cell', { name: '2026-10-19 09:30' })).toBeNull();
    expect(ledger.listReads(ID.alice).at(-1)!.get('search')).toBe('pa');
  });

  it('"Pa": the table shows the transfer the list matches, from calling system "PayHub"', async () => {
    const ledger = stubLedger({ transfers: searchable });
    renderScreen();

    await searchFor('Pa');

    expect((await rowCells('2026-10-17 08:00'))[3]).toBe('12.00 SGD');
    expect(ledger.listReads(ID.alice).at(-1)!.get('search')).toBe('Pa');
  });

  it('"p": no transfer list is read', async () => {
    const ledger = stubLedger({ transfers: searchable });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');
    const readsBefore = ledger.listReads().length;
    expect(readsBefore).toBeGreaterThan(0);

    await userEvent.type(screen.getByRole('searchbox'), 'p');
    await settle();

    expect(screen.getByRole('searchbox')).toHaveValue('p');
    expect(ledger.listReads()).toHaveLength(readsBefore);
  });

  it('"": the table shows Alice\'s transfers with no search', async () => {
    const ledger = stubLedger({ transfers: searchable });
    renderScreen();
    await searchFor('pa');
    await rowCells('2026-10-18 08:00');

    await userEvent.clear(screen.getByRole('searchbox'));
    await settle();

    expect(await rowCells('2026-10-19 09:30')).toEqual(['2026-10-19 09:30', 'ACME-000101', 'ACME-000201', '100.00 SGD', '72.52 USD', '0.74', '2.00 SGD']);
    expect((await rowCells('2026-10-16 08:00'))[3]).toBe('13.00 SGD');
    expect(ledger.listReads(ID.alice).at(-1)!.has('search')).toBe(false);
  });
});

function sortHeader(name: string): HTMLElement {
  return screen.getByRole('columnheader', { name });
}

async function clickSort(name: string): Promise<void> {
  await userEvent.click(within(sortHeader(name)).getByRole('button', { name }));
  await settle();
}

describe('Sorting by a column', () => {
  it.each([
    { clicks: [] as string[], orderBy: 'recordedat', desc: true, order: 'recorded time, newest first' },
    { clicks: ['Recorded at'], orderBy: 'recordedat', desc: false, order: 'recorded time, oldest first' },
    { clicks: ['Amount'], orderBy: 'amount', desc: false, order: 'amount, lowest first' },
    { clicks: ['Converted amount'], orderBy: 'convertedamount', desc: false, order: 'converted amount, lowest first' },
    { clicks: ['Fee'], orderBy: 'fee', desc: false, order: 'fee, lowest first' },
    { clicks: ['Fee', 'Fee'], orderBy: 'fee', desc: true, order: 'fee, highest first' },
  ])('clicking $clicks reads the list sorted by $order', async ({ clicks, orderBy, desc }) => {
    const ledger = stubLedger({ transfers: aliceList });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');

    for (const column of clicks) await clickSort(column);

    const read = ledger.listReads(ID.alice).at(-1)!;
    expect(read.get('orderBy')?.toLowerCase()).toBe(orderBy);
    expect(read.get('desc') === 'true').toBe(desc);
  });
});

describe('The source, destination and rate columns cannot be sorted', () => {
  it('offers no sort on Source, Destination and Rate, and one on Recorded at, Amount, Converted amount and Fee', async () => {
    stubLedger({ transfers: aliceList });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');

    for (const name of ['Source', 'Destination', 'Rate']) {
      expect(within(sortHeader(name)).queryByRole('button')).toBeNull();
    }
    for (const name of ['Recorded at', 'Amount', 'Converted amount', 'Fee']) {
      expect(within(sortHeader(name)).getByRole('button', { name })).toBeInTheDocument();
    }
  });
});

describe('The pager opens at 10 rows with 4 sizes', () => {
  it('reads the list 10 rows per page and offers 5, 10, 25 and 50 rows per page', async () => {
    const ledger = stubLedger({ transfers: aliceList });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');

    expect(ledger.listReads(ID.alice).at(-1)!.get('pageSize')).toBe('10');
    const sizes = screen.getByRole('combobox', { name: 'Rows per page' }) as HTMLSelectElement;
    expect(within(sizes).getAllByRole('option').map((option) => option.textContent)).toEqual(['5', '10', '25', '50']);
    expect(sizes.value).toBe('10');
  });
});

describe('A copied page address reopens the same view', () => {
  const PAYROLL_DETAIL = answer({ ...transferRow(), postings: [] });

  /** Alice's list, 3 pages long, whatever was asked of it. */
  function threePages(_accountId: string, params: URLSearchParams): ReturnType<typeof answer> {
    return answer(paged([ALICE_TO_BOB_USD], { pageNumber: Number(params.get('pageNumber') ?? 1), pageSize: Number(params.get('pageSize') ?? 10), pageCount: 3 }));
  }

  /** Mai's view, then the same view opened afresh from a copy of the page address. */
  async function reopenCopiedAddress(set: () => Promise<void>): Promise<ReturnType<typeof stubLedger>> {
    stubLedger({ transfers: threePages, transfer: () => PAYROLL_DETAIL });
    const first = renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');
    await set();
    await settle();
    const copied = window.location.search;
    first.unmount();
    vi.unstubAllGlobals();

    address.search = copied;
    const ledger = stubLedger({ transfers: threePages, transfer: () => PAYROLL_DETAIL });
    renderScreen();
    await waitFor(() => expect(accountSelect().selectedOptions[0]?.textContent).toBe(OPTION.alice));
    await rowCells('2026-10-19 09:30');
    return ledger;
  }

  it('the period Last 90 days', async () => {
    const ledger = await reopenCopiedAddress(async () => {
      const menu = await openFilterMenu();
      await userEvent.selectOptions(menu.getByLabelText('Period'), 'Last 90 days');
    });

    const read = ledger.listReads(ID.alice).at(-1)!;
    expect(read.get('from')).toBe('2026-07-21');
    expect(read.get('to')).toBe('2026-10-19');
    const menu = await openFilterMenu();
    expect((menu.getByLabelText('Period') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Last 90 days');
  });

  it('the search "payroll"', async () => {
    const ledger = await reopenCopiedAddress(() => userEvent.type(screen.getByRole('searchbox'), 'payroll'));

    expect(screen.getByRole('searchbox')).toHaveValue('payroll');
    expect(ledger.listReads(ID.alice).at(-1)!.get('search')).toBe('payroll');
  });

  it('the sort by fee, highest first', async () => {
    const ledger = await reopenCopiedAddress(async () => {
      await clickSort('Fee');
      await clickSort('Fee');
    });

    const read = ledger.listReads(ID.alice).at(-1)!;
    expect(read.get('orderBy')?.toLowerCase()).toBe('fee');
    expect(read.get('desc')).toBe('true');
    expect(sortHeader('Fee')).toHaveAttribute('aria-sort', 'descending');
  });

  it('page 2', async () => {
    const ledger = await reopenCopiedAddress(() => userEvent.click(screen.getByRole('button', { name: 'Next page' })));

    expect(ledger.listReads(ID.alice).at(-1)!.get('pageNumber')).toBe('2');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('25 rows per page', async () => {
    const ledger = await reopenCopiedAddress(() => userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '25'));

    expect(ledger.listReads(ID.alice).at(-1)!.get('pageSize')).toBe('25');
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('25');
  });

  it('the transfer "payroll-oct-001" open', async () => {
    await reopenCopiedAddress(async () => {
      await userEvent.click(screen.getByRole('cell', { name: '2026-10-19 09:30' }));
      await waitFor(() => expect(panel()).toHaveTextContent('payroll-oct-001'));
    });

    await waitFor(() => expect(panel()).toHaveTextContent('payroll-oct-001'));
  });
});

describe('A refused read is stated where it happened', () => {
  it('without postings.read: the transfer list states its failed read, with Retry, and the account select still works', async () => {
    stubLedger({ transfers: () => refused(403, { message: 'The caller lacks the postings.read scope.' }) });
    renderScreen(['accounts.read']);

    await chooseAccount(OPTION.alice);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The caller lacks the postings.read scope.');
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: '2026-10-19 09:30' })).toBeNull();
    expect(accountSelect().selectedOptions[0].textContent).toBe(OPTION.alice);
  });

  it('without accounts.read: the account select states its failed read, with Retry, and no transfer list is read', async () => {
    const ledger = stubLedger({ accountsRefusal: refused(403, { message: 'The caller lacks the accounts.read scope.' }), transfers: aliceList });
    renderScreen(['postings.read']);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The caller lacks the accounts.read scope.');
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: OPTION.alice })).toBeNull();
    await settle();
    expect(ledger.listReads()).toEqual([]);
  });
});

describe('An amount shows exactly as the ledger sent it', () => {
  it('shows 123,456,789,012.345678 XAU, digit for digit', async () => {
    const gold = transferRow({ source: ID.goldXau, destination: ID.alice, sourceCurrency: 'XAU', destinationCurrency: 'SGD', amount: '123456789012.345678', rate: '2.5', fee: '0.000000', feeAccount: null, converted: '308641972530.86' });
    stubLedger({ accounts: ledgerAccounts({ withGold: true }), transfers: (accountId) => (accountId === ID.goldXau ? answer(paged([gold])) : answer(paged([]))) });
    renderScreen();

    await chooseAccount(OPTION.goldXau);

    expect((await rowCells('2026-10-19 09:30'))[3]).toBe('123,456,789,012.345678 XAU');
  });
});
