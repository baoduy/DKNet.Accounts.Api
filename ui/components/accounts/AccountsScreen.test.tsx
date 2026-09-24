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

function jsonResponse(body: unknown, status = 200): { status: number; text: () => Promise<string>; json: () => Promise<unknown> } {
  return { status, text: async () => JSON.stringify(body), json: async () => body };
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

  it('narrows the list by currency, translated to CurrencyCode', async () => {
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

  it('renders a page button per page and marks the current one', async () => {
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

  it('opens the create-account dialog and stays open after a successful submit', async () => {
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
