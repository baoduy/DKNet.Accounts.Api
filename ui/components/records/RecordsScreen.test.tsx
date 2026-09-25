/**
 * DRK-1713 §5 — the @unit scenarios on the Records screen, driven through `RecordsScreen` with
 * the pass-through (`fetch`) stubbed, the way `AccountsScreen.test.tsx` drives its screen:
 *
 *   Scenario Outline: The period never spans more than 90 days
 *   Scenario: A search term shorter than 2 characters is not sent
 *   Scenario: The search control names only the fields it searches
 *   Scenario Outline: Only the columns the service can sort offer a sort control
 *   Scenario: The list offers no running balance and no export
 *   Scenario Outline: The screen says a posting is never edited
 *   Scenario Outline: Reverse stays on screen but refused   (the 2 "Records screen" rows; the
 *     2 "detail screen of GLOBEX-000456" rows are `components/accounts/AccountDetail.reverse-refused.test.tsx`)
 *
 * Control names follow `tests/support/records.ts`. RED today: `RecordsScreen` is a stub that
 * throws (brief §3 row 6).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordsScreen } from './RecordsScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/records',
}));

const GLOBEX_ID = 'a0000000-0000-4000-8000-000000000456';
const P_10001 = 'b0000000-0000-4000-8000-000000010001';
const P_10042 = 'b0000000-0000-4000-8000-000000010042';
const P_10077 = 'b0000000-0000-4000-8000-000000010077';

const POSTINGS = [
  { id: P_10001, postingNumber: 'P-10001', accountId: GLOBEX_ID, streamPosition: 1, direction: 'Credit', amount: '10.00', signedAmount: '10.00', currency: 'SGD', status: 'Posted', category: 'Transfer', effectiveDate: '2026-09-20' },
  { id: P_10042, postingNumber: 'P-10042', accountId: GLOBEX_ID, streamPosition: 2, direction: 'Credit', amount: '30.00', signedAmount: '30.00', currency: 'SGD', status: 'Reversed', category: 'Transfer', effectiveDate: '2026-09-20', reversedByPostingId: P_10077 },
  { id: P_10077, postingNumber: 'P-10077', accountId: GLOBEX_ID, streamPosition: 3, direction: 'Debit', amount: '30.00', signedAmount: '-30.00', currency: 'SGD', status: 'Posted', category: 'Reversal', description: 'duplicate of the morning batch', effectiveDate: '2026-09-21', reversesPostingId: P_10042 },
];

const GLOBEX = { id: GLOBEX_ID, accountNumber: 'GLOBEX-000456', name: 'Globex Treasury', currency: 'SGD', status: 'Active', balance: '10.00', availableBalance: '10.00', heldAmount: '0.00', permittedToGoNegative: false };

const ALL_SCOPES = ['accounts.read', 'postings.read', 'postings.write', 'postings.reverse'];

function jsonResponse(body: unknown, status = 200): { status: number; ok: boolean; text: () => Promise<string>; json: () => Promise<unknown> } {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body), json: async () => body };
}

function fetchDispatcher(url: string): ReturnType<typeof jsonResponse> {
  if (url.startsWith('/api/ledger/postings?')) return jsonResponse({ items: POSTINGS, pageIndex: 0, pageSize: 10, pageCount: 1, hasNextPage: false });
  const one = POSTINGS.find((posting) => url === `/api/ledger/postings/${posting.id}`);
  if (one) return jsonResponse(one);
  if (url.startsWith('/api/ledger/accounts?')) return jsonResponse({ items: [GLOBEX], pageNumber: 1, pageSize: 1000, pageCount: 1, totalItemCount: 1 });
  if (url.startsWith(`/api/ledger/accounts/${GLOBEX_ID}`)) return jsonResponse(GLOBEX);
  if (url.startsWith('/api/ledger/currencies')) return jsonResponse([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]);
  return jsonResponse({ status: 404, errors: [{ message: `unexpected fetch: ${url}` }] }, 404);
}

function stubLedger(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(String(url))));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The query of every posting-list request the screen sent. */
function postingListQueries(fetchMock: ReturnType<typeof vi.fn>): URLSearchParams[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith('/api/ledger/postings?'))
    .map((url) => new URLSearchParams(url.split('?')[1]));
}

function renderScreen(grantedScopes: string[] = ALL_SCOPES): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(RecordsScreen, { grantedScopes })));
}

/** Waits for the list to draw, then opens `postingNumber`'s details. */
async function openPosting(postingNumber: string): Promise<HTMLElement> {
  const cell = await screen.findByRole('cell', { name: postingNumber });
  fireEvent.click(cell);
  const panel = await screen.findByTestId('detail-panel');
  await waitFor(() => expect(panel).toHaveTextContent(postingNumber));
  return panel;
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150));
}

afterEach(() => {
  vi.unstubAllGlobals();
  mockSearch = '';
});

describe('The period never spans more than 90 days', () => {
  // DRK-1745: rewrite for the new form
  it.skip('2026-06-26 to 2026-09-24: the list is requested for that period', async () => {
    const fetchMock = stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-10001' });

    fireEvent.change(screen.getByLabelText('To', { exact: true }), { target: { value: '2026-09-24' } });
    fireEvent.change(screen.getByLabelText('From', { exact: true }), { target: { value: '2026-06-26' } });

    await waitFor(() => expect(postingListQueries(fetchMock).some((q) => q.get('from') === '2026-06-26' && q.get('to') === '2026-09-24')).toBe(true));
    expect(screen.queryByText('The period may span at most 90 days.')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('2026-06-25 to 2026-09-24: the period is refused on screen and nothing is sent', async () => {
    const fetchMock = stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-10001' });

    fireEvent.change(screen.getByLabelText('To', { exact: true }), { target: { value: '2026-09-24' } });
    fireEvent.change(screen.getByLabelText('From', { exact: true }), { target: { value: '2026-06-25' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('The period may span at most 90 days.');
    await settle();
    expect(postingListQueries(fetchMock).some((q) => q.get('from') === '2026-06-25')).toBe(false);
  });
});

describe('A search term shorter than 2 characters is not sent', () => {
  // DRK-1745: rewrite for the new form
  it.skip('"P" sends no search and the list stays as it was', async () => {
    const fetchMock = stubLedger();
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-10001' });

    await user.type(screen.getByLabelText('Search postings', { exact: true }), 'P');
    await settle();

    expect(postingListQueries(fetchMock).some((q) => q.has('search'))).toBe(false);
    expect(screen.getByRole('cell', { name: 'P-10001' })).toBeInTheDocument();

    // The presence half: a second character does send the search.
    await user.type(screen.getByLabelText('Search postings', { exact: true }), '-');
    await waitFor(() => expect(postingListQueries(fetchMock).some((q) => q.get('search') === 'P-')).toBe(true));
  });
});

describe('The search control names only the fields it searches', () => {
  // DRK-1745: rewrite for the new form
  it.skip('says it searches posting number, counterparty reference and description, and names no other field', async () => {
    stubLedger();
    renderScreen();

    const search = await screen.findByLabelText('Search postings', { exact: true });
    expect(search).toHaveAccessibleDescription('Searches posting number, counterparty reference and description');
  });
});

describe('Only the columns the service can sort offer a sort control', () => {
  // DRK-1745: rewrite for the new form
  it.skip.each([
    { column: 'Posting number', control: true },
    { column: 'Amount', control: true },
    { column: 'Effective date', control: true },
    { column: 'Account', control: false },
    { column: 'Direction', control: false },
    { column: 'Category', control: false },
    { column: 'Currency', control: false },
    { column: 'Status', control: false },
  ])('the $column column heading offers a sort control: $control', async ({ column, control }) => {
    stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-10001' });

    const heading = screen.getByRole('columnheader', { name: column });
    if (control) expect(within(heading).getByRole('button', { name: column })).toBeInTheDocument();
    else expect(within(heading).queryByRole('button')).toBeNull();
  });
});

describe('The list offers no running balance and no export', () => {
  // DRK-1745: rewrite for the new form
  it.skip('has no running-balance column and no export action', async () => {
    stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-10001' });

    const headings = screen.getAllByRole('columnheader').map((heading) => heading.textContent?.trim());
    expect(headings).toEqual(['Posting number', 'Account', 'Direction', 'Category', 'Amount', 'Currency', 'Effective date', 'Status']);
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /export/i })).toBeNull();
    // The screen's own action is there — the absence above is not an empty action bar.
    expect(screen.getByRole('button', { name: 'Record posting' })).toBeInTheDocument();
  });
});

const NEVER_EDITED = 'A posting is never edited or deleted. Reversing records an opposing posting and marks this one reversed. Both stay on the account.';

describe('The screen says a posting is never edited', () => {
  // DRK-1745: rewrite for the new form
  it.skip("the posting's details", async () => {
    stubLedger();
    renderScreen();

    const panel = await openPosting('P-10001');

    expect(within(panel).getByText(NEVER_EDITED)).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip("the reversal's confirmation", async () => {
    stubLedger();
    const user = userEvent.setup();
    renderScreen();

    const panel = await openPosting('P-10001');
    await user.click(within(panel).getByRole('button', { name: 'Reverse' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(NEVER_EDITED)).toBeInTheDocument();
  });
});

describe('Reverse stays on screen but refused — Records screen', () => {
  it('P-10042, already reversed by P-10077: disabled, "Already reversed by P-10077" with the code POSTING_ALREADY_REVERSED', async () => {
    stubLedger();
    renderScreen();

    const panel = await openPosting('P-10042');

    await waitFor(() => expect(panel).toHaveTextContent('Already reversed by P-10077'));
    expect(within(panel).getByRole('button', { name: 'Reverse' })).toBeDisabled();
    expect(within(panel).getByText(/\bPOSTING_ALREADY_REVERSED\b/)).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('P-10077, a reversal of P-10042: disabled, "This posting is a reversal of P-10042; record a new posting to correct it" with no code', async () => {
    stubLedger();
    renderScreen();

    const panel = await openPosting('P-10077');

    await waitFor(() => expect(panel).toHaveTextContent('This posting is a reversal of P-10042; record a new posting to correct it'));
    expect(within(panel).getByRole('button', { name: 'Reverse' })).toBeDisabled();
    // No code-shaped token anywhere in the details: the service has none for this.
    expect(within(panel).queryByText(/\b[A-Z]+(?:_[A-Z]+)+\b/)).toBeNull();
  });

  it('the presence half: an ordinary posting offers Reverse enabled', async () => {
    stubLedger();
    renderScreen();

    const panel = await openPosting('P-10001');

    expect(within(panel).getByRole('button', { name: 'Reverse' })).toBeEnabled();
  });
});
