import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetailScreen } from './AccountDetailScreen';

function jsonResponse(body: unknown, status = 200): { status: number; ok: boolean; text: () => Promise<string> } {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) };
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
  groupId: 'g1',
  metadata: { notes: 'Reconciled monthly' },
};
const BALANCE = { currency: 'SGD', balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', floor: '0.00' };
const CURRENCIES = [{ code: 'SGD', decimalPlaces: 2 }];
const GROUPS = [{ id: 'g1', code: 'ACME', name: 'ACME Group' }];
const POSTING = {
  id: 'p1',
  postingNumber: 'PST0000000001',
  direction: 'Credit',
  amount: '50.00',
  currency: 'SGD',
  category: 'Transfer',
  status: 'Posted',
  description: 'Opening deposit',
  effectiveDate: '2026-09-01',
};
const POSTINGS_PAGE = { items: [POSTING], pageIndex: 0, pageSize: 1, pageCount: 1, hasNextPage: false };

function dispatch(found: boolean) {
  return (url: string) => {
    if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: found ? [ACCOUNT] : [] }));
    if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
    if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: GROUPS }));
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

  it("resolves the group id to the group's name (DRK-1704 finding 8)", async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Group')).toHaveValue('ACME Group'));
  });

  it('loads notes from metadata.notes (DRK-1704 finding 4)', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Free-form notes')).toHaveValue('Reconciled monthly'));
  });

  it('maps each posting into a postings-panel row', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByText('PST0000000001')).toBeInTheDocument());
  });

  it('shows the service refusal, not "not found", on a refused lookup (DRK-1704 finding 5)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) {
          return Promise.resolve(jsonResponse({ status: 401, errors: [{ message: 'Not signed in.' }] }, 401));
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByText('Not signed in.')).toBeInTheDocument());
    expect(screen.queryByText(/not found/i)).toBeNull();
  });
});
