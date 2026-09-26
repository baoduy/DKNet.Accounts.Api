/**
 * DRK-1760 §3 rows 7, 8, 9, 10 — recording a posting from the Records screen on the shared hooks:
 * "Discard unsent record?" before an entered record is dropped, `Review movement` disabled while
 * the record is in flight, the shared success card once it is recorded, amounts at the currency's
 * own decimal places.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordsScreen } from './RecordsScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const ACME_ID = 'a0000000-0000-4000-8000-000000000123';
const ACME = { id: ACME_ID, accountNumber: 'ACME-000123', name: 'Acme operating', currency: 'JPY', status: 'Active', balance: '1500', availableBalance: '1500', heldAmount: '0', permittedToGoNegative: false };
const POSTING = { id: 'b0000000-0000-4000-8000-000000000456', postingNumber: 'PST-000456', accountId: ACME_ID, streamPosition: 1, direction: 'Credit', amount: '1500', signedAmount: '1500', currency: 'JPY', status: 'Posted', category: 'Transfer', effectiveDate: '2026-09-20' };

type Answer = { status: number; ok: boolean; text: () => Promise<string> };

function answer(body: unknown, status = 200): Answer {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) };
}

function stubLedger(record: () => Promise<Answer> = () => Promise.resolve(answer({ id: 'p1' }, 201))) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return record();
    if (url.startsWith('/api/ledger/postings?')) return Promise.resolve(answer({ items: [POSTING], pageNumber: 1, pageSize: 10, pageCount: 1, totalItemCount: 1 }));
    if (url.startsWith('/api/ledger/accounts?')) return Promise.resolve(answer({ items: [ACME], pageNumber: 1, pageSize: 1000, pageCount: 1, totalItemCount: 1 }));
    if (url.startsWith(`/api/ledger/accounts/${ACME_ID}`)) return Promise.resolve(answer(ACME));
    if (url.startsWith('/api/ledger/currencies')) return Promise.resolve(answer([{ id: 'c1', code: 'JPY', name: 'Japanese Yen', decimalPlaces: 0, isActive: true }]));
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderScreen(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(RecordsScreen, { grantedScopes: ['accounts.read', 'postings.read', 'postings.write'] })));
}

function panel(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Details' });
}

async function enterRecord(): Promise<void> {
  await screen.findByText('PST-000456');
  await userEvent.click(screen.getByRole('button', { name: 'Record posting' }));
  await userEvent.selectOptions(within(panel()).getByLabelText('Account'), 'ACME-000123 — Acme operating');
  await userEvent.type(within(panel()).getByLabelText('Amount'), '100');
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
  mockSearch = '';
});

describe('Records — recording a posting', () => {
  it("draws each amount at its currency's own decimal places (row 9)", async () => {
    stubLedger();
    renderScreen();

    const row = (await screen.findByText('PST-000456')).closest('tr')!;
    expect(within(row).getByText('+1,500')).toBeInTheDocument();
  });

  it('states the scale of the chosen account in the amount hint (row 9)', async () => {
    stubLedger();
    renderScreen();
    await enterRecord();

    expect(within(panel()).getByText(/^Unsigned, at 0 decimal places\./)).toBeInTheDocument();
  });

  it('asks "Discard unsent record?" before an entered record is dropped (row 7)', async () => {
    stubLedger();
    renderScreen();
    await enterRecord();

    await userEvent.click(within(panel()).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: 'Discard unsent record?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(within(panel()).getByLabelText('Amount')).toHaveValue('100');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard record' }));
    expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull();
  });

  it('disables Review movement while the record is in flight, then shows "Record posted" (rows 8, 10)', async () => {
    let answerRecord!: (answer: Answer) => void;
    const fetchMock = stubLedger(() => new Promise((resolve) => (answerRecord = resolve)));
    renderScreen();
    await enterRecord();
    const review = within(panel()).getByRole('button', { name: 'Review movement' });

    await userEvent.click(review);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Record posting' }));
    await waitFor(() => expect(review).toBeDisabled());

    answerRecord(answer({ id: 'p1' }, 201));
    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent('Record posted');
    expect(card).toHaveTextContent('Credit of 100 JPY against ACME-000123');
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
    expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull();
  });

  it("keeps the record open with the service's refusal when it is refused", async () => {
    stubLedger(() => Promise.resolve(answer({ errors: [{ code: 'INSUFFICIENT_FUNDS', message: 'The debit would take the account past its floor.' }] }, 422)));
    renderScreen();
    await enterRecord();

    await userEvent.click(within(panel()).getByRole('button', { name: 'Review movement' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Record posting' }));

    expect(await within(panel()).findByText('The debit would take the account past its floor.', { exact: false })).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Review movement' })).toBeEnabled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('states that the service did not answer when the record got no answer', async () => {
    stubLedger(() => Promise.reject(new TypeError('fetch failed')));
    renderScreen();
    await enterRecord();

    await userEvent.click(within(panel()).getByRole('button', { name: 'Review movement' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Record posting' }));

    expect(await within(panel()).findByText('The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.')).toBeInTheDocument();
  });
});

describe('Records — the view in the address (DRK-1760 §3 row 5)', () => {
  it('adds one history entry per narrowing, dropping the default period from the address', async () => {
    mockSearch = 'period=7d';
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined);
    stubLedger();
    renderScreen();
    await screen.findByText('PST-000456');
    await userEvent.click(screen.getByRole('button', { name: /^Filter/ }));
    const menu = within(screen.getByRole('group', { name: 'Filters' }));

    await userEvent.selectOptions(menu.getByLabelText('Direction'), 'Debit');
    expect(push).toHaveBeenLastCalledWith(null, '', '/records?period=7d&direction=Debit');
    await userEvent.selectOptions(menu.getByLabelText('Period'), 'Last 30 days');
    expect(push).toHaveBeenLastCalledWith(null, '', '/records?direction=Debit');
    await userEvent.selectOptions(menu.getByLabelText('Period'), 'Last 90 days');
    expect(push).toHaveBeenLastCalledWith(null, '', '/records?direction=Debit&period=90d');
    push.mockRestore();
  });
});

describe('Records — reversing a posting (DRK-1760 §3 row 8)', () => {
  it('shows "Record reversed" once the reversal went through', async () => {
    stubLedger(() => Promise.resolve(answer({ id: 'p2' }, 201)));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(RecordsScreen, { grantedScopes: ['accounts.read', 'postings.read', 'postings.reverse'] })));
    await userEvent.click(await screen.findByText('PST-000456'));

    await userEvent.click(await within(screen.getByTestId('detail-panel')).findByRole('button', { name: 'Reverse' }));
    await userEvent.type(screen.getByPlaceholderText('Why this record is being reversed.'), 'Entered twice.');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reverse record' }));

    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent('Record reversed');
    expect(card).toHaveTextContent('PST-000456');
  });
});
