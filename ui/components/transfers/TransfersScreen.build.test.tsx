/**
 * DRK-2325 Build tests — the screen's branches the acceptance tests do not reach, driven through
 * the same harness (`transfers.fixture.ts`): an account past the select's first 1000, a refused
 * currency read, a refused detail read, a stale rate never sent, the confirm step's Back, and the
 * pure formatting helpers.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { answer, chooseAccount, ID, inPanel, ledgerAccounts, OPTION, paged, panel, refused, renderScreen, resetScreen, rowCells, setNow, settle, stubLedger, transferRow } from './transfers.fixture';
import { amountText, recordedAtText } from './TransfersTable';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/transfers' }));

const OUTSIDER = 'a0000000-0000-4000-8000-000000000999';
const MISSING = 'a0000000-0000-4000-8000-000000000404';

beforeEach(() => setNow());
afterEach(() => resetScreen());

describe('recordedAtText', () => {
  it.each([
    { recordedAt: '2026-10-19T09:30:00+00:00', expected: '2026-10-19 09:30' },
    { recordedAt: '2026-10-20T01:15:00+08:00', expected: '2026-10-19 17:15' },
    { recordedAt: 'not a time', expected: 'not a time' },
  ])('$recordedAt reads $expected', ({ recordedAt, expected }) => {
    expect(recordedAtText(recordedAt)).toBe(expected);
  });
});

describe('amountText', () => {
  it('draws the amount at its places, grouped', () => {
    expect(amountText('1234.5', 'SGD', 2)).toBe('1,234.50 SGD');
  });

  it('draws the exact text as sent when the places are unknown', () => {
    expect(amountText('1234.5', 'SGD', undefined)).toBe('1234.5 SGD');
  });
});

/** Answers `GET /accounts/{id}` for `account`, which the account list does not hold; every other call goes to the stub. */
function alsoHold(account: Record<string, unknown>): string[] {
  const reads: string[] = [];
  const stub = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input === `/api/ledger/accounts/${String(account.id)}`) {
      reads.push(input);
      return answer(account);
    }
    return stub(input, init);
  });
  return reads;
}

describe('An account the select does not hold', () => {
  it('is read on its own and shown by number; one the ledger cannot find shows its id', async () => {
    stubLedger({
      transfers: () =>
        answer(
          paged([
            transferRow({ destination: OUTSIDER, destinationCurrency: 'SGD', rate: null, converted: '98.00' }),
            transferRow({ id: 'c0000000-0000-4000-8000-000000000002', destination: MISSING, destinationCurrency: 'SGD', rate: null, converted: '98.00', recordedAt: '2026-10-18T09:30:00+00:00' }),
          ]),
        ),
    });
    const reads = alsoHold({ ...ledgerAccounts()[0], id: OUTSIDER, accountNumber: 'ACME-000999', name: 'Far SGD' });
    renderScreen();

    await chooseAccount(OPTION.alice);

    expect((await rowCells('2026-10-19 09:30'))[2]).toBe('ACME-000999');
    expect((await rowCells('2026-10-18 09:30'))[2]).toBe(MISSING);
    expect(reads).toEqual([`/api/ledger/accounts/${OUTSIDER}`]);
  });
});

describe('The account choice', () => {
  it('reads nothing for no account, and choosing none again clears the table', async () => {
    const ledger = stubLedger({ transfers: () => answer(paged([transferRow()])) });
    renderScreen();
    await screen.findByRole('option', { name: OPTION.alice });
    await settle();
    expect(ledger.calls.filter((call) => call.url.includes('/transfers'))).toEqual([]);

    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Account' }), 'Select an account');

    expect(await screen.findByText('Choose an account to see its transfers.')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: '2026-10-19 09:30' })).toBeNull();
  });

  it('keeps the default period out of the page address', async () => {
    stubLedger({ transfers: () => answer(paged([transferRow()])) });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');

    await userEvent.click(screen.getByRole('button', { name: /^Filter/ }));
    const period = within(screen.getByRole('group', { name: 'Filters' })).getByLabelText('Period');
    await userEvent.selectOptions(period, 'Last 90 days');
    expect(new URLSearchParams(window.location.search).get('period')).toBe('90d');
    await userEvent.selectOptions(period, 'Last 1 year');

    expect(new URLSearchParams(window.location.search).has('period')).toBe(false);
  });
});

describe('Rows wait for the currency list', () => {
  it('draws no row while the currencies are still being read', async () => {
    stubLedger({ transfers: () => answer(paged([transferRow()])) });
    const stub = globalThis.fetch;
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => (input.startsWith('/api/ledger/currencies') ? new Promise(() => undefined) : stub(input, init)));
    renderScreen();

    await chooseAccount(OPTION.alice);
    await settle();

    expect(screen.queryByRole('cell', { name: '2026-10-19 09:30' })).toBeNull();
  });
});

describe('A refused currency read', () => {
  it('is stated, and the amounts are drawn exactly as the ledger sent them', async () => {
    stubLedger({ transfers: () => answer(paged([transferRow({ amount: '1234.5', converted: '913.53' })])) });
    const stub = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) =>
      input.startsWith('/api/ledger/currencies') ? refused(403, { message: 'The caller lacks the currencies scope.' }) : stub(input, init),
    );
    renderScreen();

    await chooseAccount(OPTION.alice);

    expect(await rowCells('2026-10-19 09:30')).toEqual(['2026-10-19 09:30', 'ACME-000101', 'ACME-000201', '1234.5 SGD', '913.53 USD', '0.74', '2.00 SGD']);
    expect(screen.getByRole('alert')).toHaveTextContent('The caller lacks the currencies scope.');
  });
});

describe('The detail panel', () => {
  it('states a refused postings read in the panel, with Retry, and a second click on the row closes it', async () => {
    stubLedger({ transfers: () => answer(paged([transferRow()])), transfer: () => refused(403, { message: 'The caller lacks the postings.read scope.' }) });
    renderScreen();
    await chooseAccount(OPTION.alice);
    await rowCells('2026-10-19 09:30');

    await userEvent.click(screen.getByRole('cell', { name: '2026-10-19 09:30' }));

    const alert = await inPanel().findByRole('alert');
    expect(alert).toHaveTextContent('The caller lacks the postings.read scope.');
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(panel()).toHaveTextContent('payroll-oct-001');

    await userEvent.click(screen.getByRole('cell', { name: '2026-10-19 09:30' }));
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull());
  });
});

describe('Record transfer', () => {
  async function openPanel(): Promise<ReturnType<typeof stubLedger>> {
    const ledger = stubLedger({ transfers: () => answer(paged([])) });
    renderScreen();
    await chooseAccount(OPTION.alice);
    const open = screen.getByRole('button', { name: 'Record transfer' });
    await waitFor(() => expect(open).toBeEnabled());
    await userEvent.click(open);
    return ledger;
  }

  it('never uses or sends a rate or fee account left from earlier entries', async () => {
    const ledger = await openPanel();
    await userEvent.selectOptions(inPanel().getByLabelText('Destination account'), OPTION.bobUsd);
    await userEvent.type(inPanel().getByLabelText('Rate'), '0.74');
    await userEvent.selectOptions(inPanel().getByLabelText('Destination account'), OPTION.bobSgd);
    await userEvent.type(inPanel().getByLabelText('Amount'), '10.00');
    await userEvent.clear(inPanel().getByLabelText('Fee'));
    await userEvent.type(inPanel().getByLabelText('Fee'), '1.00');
    await userEvent.selectOptions(inPanel().getByLabelText('Fee account'), OPTION.feesSgd);
    await userEvent.clear(inPanel().getByLabelText('Fee'));
    await userEvent.type(inPanel().getByLabelText('Fee'), '0');

    await userEvent.click(inPanel().getByRole('button', { name: 'Review transfer' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/gets an estimated/)).toHaveTextContent('ACME-000102 gets an estimated 10.00 SGD.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record transfer' }));

    await waitFor(() => expect(ledger.sends()).toHaveLength(1));
    expect(JSON.parse(ledger.sends()[0].body!)).toEqual({ sourceAccountId: ID.alice, destinationAccountId: ID.bobSgd, amount: '10.00', sourceCurrency: 'SGD', destinationCurrency: 'SGD', fee: '0' });
  });

  it("the confirm step's Back sends nothing and keeps the panel's entries", async () => {
    const ledger = await openPanel();
    await userEvent.selectOptions(inPanel().getByLabelText('Destination account'), OPTION.bobSgd);
    await userEvent.type(inPanel().getByLabelText('Amount'), '10.00');
    await userEvent.click(inPanel().getByRole('button', { name: 'Review transfer' }));
    const dialog = await screen.findByRole('dialog');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Back' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await settle();
    expect(ledger.sends()).toEqual([]);
    expect(inPanel().getByLabelText('Amount')).toHaveValue('10.00');
  });
});
