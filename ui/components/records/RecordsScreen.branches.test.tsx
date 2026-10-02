/**
 * DRK-1713 §3 rows 5-7 — the Records screen's own branches the acceptance tests do not reach:
 * narrowing and clearing a filter, sort direction, paging, closing the details, refused reads,
 * a shared link naming a posting off the listed page, and a currency the list does not name.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
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

function stubLedger({ items = [P1], pageCount = 2, listStatus = 200, currenciesStatus = 200, pending = [] }: Stub = {}): Mock<(raw: string) => Promise<unknown>> {
  const fetchMock = vi.fn<(raw: string) => Promise<unknown>>().mockImplementation((raw: string) => {
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

  it('shows an amount as sent in the list when the currency list does not name its currency', async () => {
    stubLedger({ items: [{ ...OFF_PAGE, postingNumber: 'P-98' }], pageCount: 1 });
    renderScreen();

    const row = (await screen.findByRole('cell', { name: 'P-98' })).closest('tr')!;
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['P-98', 'GLOBEX-000456', 'Credit', '', '7', 'XAU', '', 'Posted']);
  });
});

describe('RecordsScreen — screen states (DRK-1725 §3)', () => {
  function stubList(page: Record<string, unknown>): Mock<(raw: string) => Promise<unknown>> {
    const fetchMock = stubLedger();
    const answer = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((raw: string) => (String(raw).startsWith('/api/ledger/postings?') ? Promise.resolve(jsonResponse(page)) : answer(raw)));
    return fetchMock;
  }

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

  it('reads a search of exactly 3 characters, placeholders standing in meanwhile', async () => {
    mockSearch = 'search=abc';
    const fetchMock = stubLedger();
    const answer = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((raw: string) => (String(raw).startsWith('/api/ledger/postings?') ? new Promise(() => {}) : answer(raw)));
    renderScreen();
    await waitFor(() => expect(lastListQuery(fetchMock).get('search')).toBe('abc'));
    expect(document.querySelectorAll('tbody tr [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
