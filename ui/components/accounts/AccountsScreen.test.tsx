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

  it('sorts by a column when its header button is clicked', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByText('Operating account')).toBeInTheDocument());
    await user.click(screen.getByRole('columnheader', { name: /Name/ }).querySelector('button')!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('orderBy=name')));
  });

  it('gates the Open account button on the accounts.write scope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    renderScreen([]);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeDisabled());
  });
});

describe('AccountsScreen — screen states (DRK-1725 §3)', () => {
  function withAccounts(page: unknown): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(url.includes('/api/ledger/accounts') ? jsonResponse(page) : fetchDispatcher(url)));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('never stands placeholders in for a search too short to send', async () => {
    mockSearch = 'search=a';
    withAccounts(ACCOUNTS_PAGE);
    const { container } = renderScreen();
    expect(await screen.findByRole('cell', { name: 'No accounts match this filter.' })).toBeInTheDocument();
    expect(container.querySelector('tbody [data-slot="skeleton"]')).toBeNull();
  });
});
