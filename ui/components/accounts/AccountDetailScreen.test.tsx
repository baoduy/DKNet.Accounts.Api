import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetailScreen } from './AccountDetailScreen';

function jsonResponse(body: unknown): { status: number; text: () => Promise<string> } {
  return { status: 200, text: async () => JSON.stringify(body) };
}

const ACCOUNT = {
  id: 'a1',
  accountNumber: 'ACME-000123',
  name: 'Operating account',
  currency: 'SGD',
  status: 'Active',
  balance: '100.00',
  availableBalance: '100.00',
  heldAmount: '0.00',
  permittedToGoNegative: false,
};
const BALANCE = { currency: 'SGD', balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', floor: '0.00' };
const CURRENCIES = [{ code: 'SGD', decimalPlaces: 2 }];
const POSTINGS_PAGE = { items: [], pageIndex: 0, pageSize: 0, pageCount: 1, hasNextPage: false };

function dispatch(found: boolean) {
  return (url: string) => {
    if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: found ? [ACCOUNT] : [] }));
    if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
    if (url.includes('/currencies')) return Promise.resolve(jsonResponse(CURRENCIES));
    if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
    throw new Error(`unexpected fetch: ${url}`);
  };
}

function renderScreen(found = true) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(dispatch(found)));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountDetailScreen', () => {
  it('resolves the account number and renders its balance', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByTestId('account-balance')).toHaveTextContent('100.00'));
  });

  it('renders not-found for an address matching no account', async () => {
    renderScreen(false);
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
    expect(screen.queryByTestId('account-balance')).toBeNull();
  });
});
