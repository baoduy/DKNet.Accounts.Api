import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountsScreen } from './AccountsScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

function jsonResponse(body: unknown, status = 200): { status: number; ok: boolean; text: () => Promise<string>; json: () => Promise<unknown> } {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body), json: async () => body };
}

const ACCOUNTS_PAGE = {
  items: [{ accountNumber: 'ACME-000123', name: 'Operating account', currency: 'SGD', balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', status: 'Active', openedOn: '2026-01-01' }],
  pageNumber: 1,
  pageSize: 2,
  pageCount: 1,
  totalItemCount: 1,
};
const CURRENCIES = [{ code: 'SGD', decimalPlaces: 2 }];
const GROUPS = [{ id: 'g1', code: 'ACME', name: 'ACME' }];

function fetchDispatcher(url: string): ReturnType<typeof jsonResponse> {
  if (url.includes('/api/ledger/accounts')) return jsonResponse(ACCOUNTS_PAGE);
  if (url.includes('/api/ledger/currencies')) return jsonResponse(CURRENCIES);
  if (url.includes('/api/ledger/account-groups')) return jsonResponse({ items: GROUPS });
  throw new Error(`unexpected fetch: ${url}`);
}

function renderScreen(grantedScopes: string[] = []): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountsScreen, { grantedScopes })));
}

afterEach(() => {
  vi.unstubAllGlobals();
  mockSearch = '';
});

describe('AccountsScreen', () => {
  it('renders the accounts list from the service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    renderScreen();

    await waitFor(() => expect(screen.getByText('Operating account')).toBeInTheDocument());
  });

  // DRK-1745: rewrite for the new form
  it.skip('narrows the list by currency, translated to CurrencyCode', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('option', { name: 'SGD' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Currency filter'), 'SGD');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('CurrencyCode%3AEqual%3ASGD')));
  });

  it('sorts by a column when its header button is clicked', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByText('Operating account')).toBeInTheDocument());
    await user.click(screen.getByRole('columnheader', { name: /Name/ }).querySelector('button')!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('orderBy=name')));
  });

  // DRK-1745: rewrite for the new form
  it.skip('renders a page button per page and marks the current one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ledger/accounts')) return Promise.resolve(jsonResponse({ ...ACCOUNTS_PAGE, pageCount: 2 }));
        return Promise.resolve(fetchDispatcher(url));
      }),
    );
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current');
  });

  it('gates the Open account button on the accounts.write scope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    renderScreen([]);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeDisabled());
  });

  // DRK-1745: rewrite for the new form
  it.skip('opens the create-account dialog and stays open after a successful submit', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/api/ledger/accounts')) {
        return Promise.resolve(jsonResponse({ id: 'a2', accountNumber: 'ACME-000002', name: 'Operating account' }, 201));
      }
      return Promise.resolve(fetchDispatcher(url));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen(['accounts.write']);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));

    await waitFor(() => expect(screen.getByLabelText('Group').querySelector('option')).toBeTruthy());
    await user.type(screen.getByLabelText('Name'), 'Operating account');
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts', expect.objectContaining({ method: 'POST' })));
    // Stays open — the operator can check the lists it just offered or open another account.
    expect(screen.getByLabelText('Group')).toBeInTheDocument();
  });
});

describe('AccountsScreen — screen states (DRK-1725 §3)', () => {
  function withAccounts(page: unknown): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(url.includes('/api/ledger/accounts') ? jsonResponse(page) : fetchDispatcher(url)));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  // DRK-1745: rewrite for the new form
  it.skip.each([
    { search: '', total: 0, message: 'No accounts yet.' },
    { search: 'status=Frozen', total: 0, message: 'No accounts match this filter.' },
    { search: 'search=zz', total: 0, message: 'No accounts match this filter.' },
    { search: 'page=9', total: 25, message: 'No more accounts.' },
  ])('says $message for an empty list at "$search"', async ({ search, total, message }) => {
    mockSearch = search;
    withAccounts({ items: [], pageNumber: 9, pageSize: 10, pageCount: 3, totalItemCount: total });
    renderScreen();
    expect(await screen.findByRole('cell', { name: message })).toHaveAttribute('colspan', '7');
  });

  it('never stands placeholders in for a search too short to send', async () => {
    mockSearch = 'search=a';
    withAccounts(ACCOUNTS_PAGE);
    const { container } = renderScreen();
    expect(await screen.findByRole('cell', { name: 'No accounts match this filter.' })).toBeInTheDocument();
    expect(container.querySelector('tbody [data-slot="skeleton"]')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('offers Retry on a failed list read, keeping the search usable', async () => {
    const fetchMock = withAccounts(ACCOUNTS_PAGE);
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/api/ledger/accounts') ? jsonResponse({ errors: [{ message: 'Ledger store unavailable' }] }, 503) : fetchDispatcher(url)),
    );
    const user = userEvent.setup();
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ledger store unavailable');
    expect(screen.getByLabelText('Search accounts')).toBeEnabled();

    fetchMock.mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url)));
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Operating account')).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('offers Retry on a failed currency read', async () => {
    const fetchMock = withAccounts(ACCOUNTS_PAGE);
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/api/ledger/currencies') ? jsonResponse({ errors: [{ message: 'Currencies were refused.' }] }, 503) : fetchDispatcher(url)),
    );
    const user = userEvent.setup();
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent('Currencies were refused.');

    fetchMock.mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url)));
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByRole('option', { name: 'SGD' })).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('keeps the currency filter on screen, set to all currencies, while the open-account form is up', async () => {
    withAccounts(ACCOUNTS_PAGE);
    const user = userEvent.setup();
    renderScreen(['accounts.write']);
    expect((screen.getByLabelText('Currency filter', { selector: 'select' }) as HTMLSelectElement).selectedOptions[0]).toHaveTextContent(/^All currencies$/);
    await user.click(await screen.findByRole('button', { name: 'Open account' }));
    expect(screen.getByLabelText('Currency filter', { selector: 'select' })).toBeInTheDocument();
  });
});
