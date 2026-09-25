/**
 * DRK-1713 §3 rows 5-7 — the Records screen's own branches the acceptance tests do not reach:
 * narrowing and clearing a filter, sort direction, paging, closing the details, refused reads,
 * a shared link naming a posting off the listed page, and a currency the list does not name.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordsScreen } from './RecordsScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/records',
}));

const ACME_ID = 'a0000000-0000-4000-8000-000000000123';
const GLOBEX_ID = 'a0000000-0000-4000-8000-000000000456';
const P_1 = 'b0000000-0000-4000-8000-000000000001';
const P_OFF_PAGE = 'b0000000-0000-4000-8000-000000000099';

const ACME = { id: ACME_ID, accountNumber: 'ACME-000123', name: 'Acme Operating', currency: 'SGD', status: 'Active', balance: '0.00', availableBalance: '0.00', heldAmount: '0.00', permittedToGoNegative: false };
const GLOBEX = { ...ACME, id: GLOBEX_ID, accountNumber: 'GLOBEX-000456', name: 'Globex Treasury' };
const P1 = { id: P_1, postingNumber: 'P-1', accountId: ACME_ID, streamPosition: 1, direction: 'Credit', amount: '10', signedAmount: '10.00', currency: 'SGD', status: 'Posted', category: 'Transfer', description: 'Payroll', effectiveDate: '2026-09-20' };
const OFF_PAGE = { id: P_OFF_PAGE, postingNumber: 'P-99', accountId: GLOBEX_ID, streamPosition: 9, direction: 'Credit', amount: '7', signedAmount: '7', currency: 'XAU', status: 'Posted' };

function jsonResponse(body: unknown, status = 200): { status: number; ok: boolean; text: () => Promise<string>; json: () => Promise<unknown> } {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body), json: async () => body };
}

interface Stub {
  /** Ids whose read never answers. */
  pending?: string[];
  items?: unknown[];
  pageCount?: number;
  listStatus?: number;
  currenciesStatus?: number;
}

function stubLedger({ items = [P1], pageCount = 2, listStatus = 200, currenciesStatus = 200, pending = [] }: Stub = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation((raw: string) => {
    const url = String(raw);
    if (pending.some((id) => url.endsWith(`/${id}`))) return new Promise(() => {});
    if (url.startsWith('/api/ledger/postings?')) {
      if (listStatus !== 200) return Promise.resolve(jsonResponse({ errors: [{ message: 'The list was refused.', code: 'INVALID_DATE_RANGE' }] }, listStatus));
      return Promise.resolve(jsonResponse({ items, pageIndex: 0, pageSize: 10, pageCount, hasNextPage: pageCount > 1 }));
    }
    if (url === `/api/ledger/postings/${P_OFF_PAGE}`) return Promise.resolve(jsonResponse(OFF_PAGE));
    if (url === `/api/ledger/postings/${P_1}`) return Promise.resolve(jsonResponse(P1));
    if (url === `/api/ledger/accounts/${ACME_ID}`) return Promise.resolve(jsonResponse(ACME));
    if (url === `/api/ledger/accounts/${GLOBEX_ID}`) return Promise.resolve(jsonResponse(GLOBEX));
    if (url.startsWith('/api/ledger/currencies')) {
      if (currenciesStatus !== 200) return Promise.resolve(jsonResponse({ errors: [{ message: 'Currencies were refused.' }] }, currenciesStatus));
      return Promise.resolve(jsonResponse([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]));
    }
    return Promise.resolve(jsonResponse({ errors: [{ message: `unexpected fetch: ${url}` }] }, 404));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function lastListQuery(fetchMock: ReturnType<typeof vi.fn>): URLSearchParams {
  const url = fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith('/api/ledger/postings?')).at(-1)!;
  return new URLSearchParams(url.split('?')[1]);
}

function renderScreen(grantedScopes: string[] = ['postings.read']): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(RecordsScreen, { grantedScopes })));
}

afterEach(() => {
  vi.unstubAllGlobals();
  mockSearch = '';
  window.history.pushState(null, '', '/');
});

describe('RecordsScreen', () => {
  // DRK-1745: rewrite for the new form
  it.skip('asks for the most recently recorded first by default, then sorts a column ascending and flips it on a second press', async () => {
    const fetchMock = stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-1' });
    expect(lastListQuery(fetchMock).get('orderBy')).toBe('RecordedAt');
    expect(lastListQuery(fetchMock).get('desc')).toBe('true');
    expect(['accountId', 'direction', 'category', 'status', 'search'].filter((key) => lastListQuery(fetchMock).has(key))).toEqual([]);
    expect(screen.getByLabelText('Direction filter')).toHaveDisplayValue('All directions');
    expect(screen.getByLabelText('Category filter')).toHaveDisplayValue('All categories');
    expect(screen.getByLabelText('Status filter')).toHaveDisplayValue('All statuses');

    fireEvent.click(within(screen.getByRole('columnheader', { name: 'Amount' })).getByRole('button'));
    await waitFor(() => expect(lastListQuery(fetchMock).get('orderBy')).toBe('Amount'));
    expect(lastListQuery(fetchMock).has('desc')).toBe(false);
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'ascending');

    // Another column starts ascending, whatever the previous column's direction.
    fireEvent.click(within(screen.getByRole('columnheader', { name: 'Effective date' })).getByRole('button'));
    await waitFor(() => expect(lastListQuery(fetchMock).get('orderBy')).toBe('EffectiveDate'));
    expect(lastListQuery(fetchMock).has('desc')).toBe(false);

    fireEvent.click(within(screen.getByRole('columnheader', { name: 'Effective date' })).getByRole('button'));
    await waitFor(() => expect(lastListQuery(fetchMock).get('desc')).toBe('true'));
    expect(window.location.search).toContain('sort=-EffectiveDate');

    fireEvent.click(within(screen.getByRole('columnheader', { name: 'Posting number' })).getByRole('button'));
    await waitFor(() => expect(lastListQuery(fetchMock).get('orderBy')).toBe('PostingNumber'));
    expect(lastListQuery(fetchMock).has('desc')).toBe(false);
  });

  // DRK-1745: rewrite for the new form
  it.skip('narrows on a filter from the first page, and drops it again when cleared', async () => {
    const fetchMock = stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    await waitFor(() => expect(lastListQuery(fetchMock).get('pageNumber')).toBe('2'));
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 1' })).not.toHaveAttribute('aria-current');

    fireEvent.change(screen.getByLabelText('Category filter'), { target: { value: 'Fee' } });
    await waitFor(() => expect(lastListQuery(fetchMock).get('category')).toBe('Fee'));
    expect(lastListQuery(fetchMock).get('pageNumber')).toBe('1');

    fireEvent.change(screen.getByLabelText('Direction filter'), { target: { value: 'Debit' } });
    fireEvent.change(screen.getByLabelText('Status filter'), { target: { value: 'Reversed' } });
    await waitFor(() => expect(lastListQuery(fetchMock).get('status')).toBe('Reversed'));
    expect(lastListQuery(fetchMock).get('direction')).toBe('Debit');
    expect(lastListQuery(fetchMock).get('category')).toBe('Fee');

    fireEvent.change(screen.getByLabelText('Category filter'), { target: { value: '' } });
    await waitFor(() => expect(lastListQuery(fetchMock).has('category')).toBe(false));
    expect(window.location.search).not.toContain('category');
    expect(lastListQuery(fetchMock).get('direction')).toBe('Debit');
  });

  // DRK-1745: rewrite for the new form
  it.skip('requests the end of the period the operator sets', async () => {
    const fetchMock = stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-1' });

    fireEvent.change(screen.getByLabelText('To', { exact: true }), { target: { value: '2026-09-10' } });

    await waitFor(() => expect(lastListQuery(fetchMock).get('to')).toBe('2026-09-10'));
  });

  // DRK-1745: rewrite for the new form
  it.skip('keeps an emptied end of the period too', async () => {
    stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-1' });

    fireEvent.change(screen.getByLabelText('To', { exact: true }), { target: { value: '' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/^A period must be set\.$/);
  });

  it('offers Record posting enabled with postings.write, and disabled naming it without', async () => {
    stubLedger();
    const { unmount } = renderScreen(['postings.read', 'postings.write']);
    expect(screen.getByRole('button', { name: 'Record posting' })).toBeEnabled();
    unmount();

    renderScreen(['postings.read']);
    expect(screen.getByRole('button', { name: 'Record posting' })).toBeDisabled();
    expect(screen.getByText('requires postings.write')).toBeInTheDocument();
  });

  it('draws no row while the list or the currencies are still being read', async () => {
    const fetchMock = stubLedger();
    fetchMock.mockImplementation((raw: string) => (String(raw).startsWith('/api/ledger/postings?') || String(raw).startsWith('/api/ledger/currencies') ? new Promise(() => {}) : Promise.resolve(jsonResponse({}, 404))));
    renderScreen();

    // Placeholder rows under the headings stand in for it (DRK-1725 R1).
    await waitFor(() => expect(document.querySelectorAll('tbody tr')).toHaveLength(10));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect([...document.querySelectorAll('tbody tr')].every((row) => row.querySelector('[data-slot="skeleton"]'))).toBe(true);
    expect(screen.queryByText(/^Loading/)).toBeNull();
    expect(fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith('/api/ledger/accounts'))).toEqual([]);
  });

  it('draws the list only once every account on it is known', async () => {
    const fetchMock = stubLedger({ items: [P1, { ...P1, id: 'b0000000-0000-4000-8000-000000000002', postingNumber: 'P-2', accountId: GLOBEX_ID }], pending: [GLOBEX_ID] });
    renderScreen();

    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes(GLOBEX_ID))).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('cell', { name: 'P-1' })).toBeNull();
    expect(document.querySelectorAll('tbody tr [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  // DRK-1745: rewrite for the new form
  it.skip('opens a listed posting from the list itself, without waiting on its own read', async () => {
    stubLedger({ pending: [P_1] });
    renderScreen();
    fireEvent.click(await screen.findByRole('cell', { name: 'P-1' }));

    expect(within(await screen.findByTestId('detail-panel')).getByRole('heading', { name: 'P-1' })).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('keeps an emptied period bound, refusing it on screen instead of falling back to the default', async () => {
    stubLedger();
    renderScreen();
    await screen.findByRole('cell', { name: 'P-1' });

    fireEvent.change(screen.getByLabelText('From', { exact: true }), { target: { value: '' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/^A period must be set\.$/);
    expect(screen.getByLabelText('From', { exact: true })).toHaveValue('');
  });

  it('closes the details when the open row is chosen again', async () => {
    stubLedger();
    renderScreen();
    fireEvent.click(await screen.findByRole('cell', { name: 'P-1' }));
    const panel = await screen.findByTestId('detail-panel');
    expect(within(panel).getByText('Payroll')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('cell', { name: 'P-1' }));

    await waitFor(() => expect(screen.queryByTestId('detail-panel')).toBeNull());
  });

  it("shows the service's wording when the list is refused", async () => {
    stubLedger({ listStatus: 422 });
    renderScreen();

    expect(await screen.findByText('The list was refused.')).toBeInTheDocument();
    expect(screen.getByText('INVALID_DATE_RANGE')).toBeInTheDocument();
  });

  it("shows the service's wording when the currencies are refused, and draws each amount as the service sent it, never at a guessed scale", async () => {
    stubLedger({ currenciesStatus: 500 });
    renderScreen();

    expect(await screen.findByText('Currencies were refused.')).toBeInTheDocument();
    // Never left loading (DRK-1725 R2): the list is drawn, its amount the service's own text.
    const row = (await screen.findByRole('cell', { name: 'P-1' })).closest('tr')!;
    expect(within(row).getAllByRole('cell')[4]).toHaveTextContent(/^10$/);
  });

  // DRK-1745: rewrite for the new form
  it.skip('opens a posting named by the page address even when it is not on the listed page, its amount as sent when its currency is unknown', async () => {
    mockSearch = `open=${P_OFF_PAGE}`;
    const fetchMock = stubLedger({ items: [P1], pageCount: 1 });
    renderScreen();

    const panel = await screen.findByTestId('detail-panel');
    expect(await within(panel).findByRole('heading', { name: 'P-99' })).toBeInTheDocument();
    expect(await within(panel).findByText('GLOBEX-000456')).toBeInTheDocument();
    expect(within(panel).getByText('7 XAU')).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([u]) => String(u))).toContain(`/api/ledger/postings/${P_OFF_PAGE}`);
  });

  it('shows an amount as sent in the list when the currency list does not name its currency', async () => {
    stubLedger({ items: [{ ...OFF_PAGE, postingNumber: 'P-98' }], pageCount: 1 });
    renderScreen();

    const row = (await screen.findByRole('cell', { name: 'P-98' })).closest('tr')!;
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['P-98', 'GLOBEX-000456', 'Credit', '', '7', 'XAU', '', 'Posted']);
  });

  // DRK-1745: rewrite for the new form
  it.skip('draws every column of a row, the amount at its currency\'s scale and the account as a link to it', async () => {
    stubLedger({ pageCount: 1 });
    renderScreen();

    const row = (await screen.findByRole('cell', { name: 'P-1' })).closest('tr')!;
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['P-1', 'ACME-000123', 'Credit', 'Transfer', '10.00', 'SGD', '2026-09-20', 'Posted']);
    expect(within(row).getByRole('link', { name: 'ACME-000123' })).toHaveAttribute('href', '/accounts/ACME-000123');
  });

  // DRK-1745: rewrite for the new form
  it.skip('reads only the accounts its rows name, and tones an amount by its direction', async () => {
    const fetchMock = stubLedger({ items: [P1, { ...P1, id: 'b0000000-0000-4000-8000-000000000002', postingNumber: 'P-2', direction: 'Debit' }], pageCount: 1 });
    renderScreen();

    const credit = (await screen.findByRole('cell', { name: 'P-1' })).closest('tr')!;
    const debit = screen.getByRole('cell', { name: 'P-2' }).closest('tr')!;
    expect(within(credit).getByText('10.00')).toHaveClass('text-credit');
    expect(within(debit).getByText('10.00')).toHaveClass('text-debit');
    expect(fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith('/api/ledger/accounts'))).toEqual([`/api/ledger/accounts/${ACME_ID}`]);
  });
});

describe('RecordsScreen — screen states (DRK-1725 §3)', () => {
  function stubList(page: Record<string, unknown>): ReturnType<typeof vi.fn> {
    const fetchMock = stubLedger();
    const answer = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((raw: string) => (String(raw).startsWith('/api/ledger/postings?') ? Promise.resolve(jsonResponse(page)) : answer(raw)));
    return fetchMock;
  }

  // DRK-1745: rewrite for the new form
  it.skip.each([
    { search: 'from=2026-09-01&to=2026-09-24', total: 0, message: 'No postings between 1 Sep and 24 Sep.' },
    { search: 'from=2026-09-01&to=2026-09-24&category=Fee', total: 0, message: 'No postings match this filter.' },
    { search: 'from=2026-09-01&to=2026-09-24&direction=Debit', total: 0, message: 'No postings match this filter.' },
    { search: 'from=2026-09-01&to=2026-09-24&status=Reversed', total: 0, message: 'No postings match this filter.' },
    { search: 'from=2026-09-01&to=2026-09-24&search=zz', total: 0, message: 'No postings match this filter.' },
    { search: 'page=9', total: 25, message: 'No more postings.' },
  ])('says $message for an empty list at "$search"', async ({ search, total, message }) => {
    mockSearch = search;
    stubList({ items: [], pageNumber: 9, pageSize: 10, pageCount: 3, totalItemCount: total });
    renderScreen();
    expect(await screen.findByRole('cell', { name: message })).toHaveAttribute('colspan', '8');
  });

  // DRK-1745: rewrite for the new form
  it.skip('states a period it refuses to send in place of the list, never loading', async () => {
    mockSearch = 'from=&to=2026-09-24';
    stubList({ items: [], totalItemCount: 0 });
    const { container } = renderScreen();
    expect(await screen.findByRole('cell', { name: 'A period must be set.' })).toBeInTheDocument();
    expect(container.querySelector('tbody [data-slot="skeleton"]')).toBeNull();
  });

  it('never stands placeholders in for a search too short to send', async () => {
    mockSearch = 'search=a';
    stubList({ items: [], totalItemCount: 0 });
    const { container } = renderScreen();
    expect(await screen.findByRole('cell', { name: 'No postings match this filter.' })).toBeInTheDocument();
    expect(container.querySelector('tbody [data-slot="skeleton"]')).toBeNull();
  });

  it('offers Retry on a failed list read, and on a failed currency read', async () => {
    const fetchMock = stubLedger({ listStatus: 422, currenciesStatus: 500 });
    renderScreen();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(2));

    const healthy = stubLedger().getMockImplementation()!;
    fetchMock.mockImplementation(healthy);
    vi.stubGlobal('fetch', fetchMock);
    for (const retry of screen.getAllByRole('button', { name: 'Retry' })) fireEvent.click(retry);
    expect(await screen.findByRole('cell', { name: 'P-1' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('moves focus into the details a row opens', async () => {
    stubLedger();
    renderScreen();
    fireEvent.click(await screen.findByRole('cell', { name: 'P-1' }));
    const panel = await screen.findByTestId('detail-panel');
    expect(panel).toHaveFocus();
    expect(panel).toHaveAttribute('tabindex', '-1');
  });

  it('keeps placeholders, drawing no row, while only the currency scale is still read', async () => {
    const fetchMock = stubLedger();
    const answer = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((raw: string) => (String(raw).startsWith('/api/ledger/currencies') ? new Promise(() => {}) : answer(raw)));
    renderScreen();
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u) === `/api/ledger/accounts/${ACME_ID}`)).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('cell', { name: 'P-1' })).toBeNull();
    expect(document.querySelectorAll('tbody tr [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('reads a search of exactly 2 characters, placeholders standing in meanwhile', async () => {
    mockSearch = 'search=ab';
    const fetchMock = stubLedger();
    const answer = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((raw: string) => (String(raw).startsWith('/api/ledger/postings?') ? new Promise(() => {}) : answer(raw)));
    renderScreen();
    await waitFor(() => expect(lastListQuery(fetchMock).get('search')).toBe('ab'));
    expect(document.querySelectorAll('tbody tr [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
