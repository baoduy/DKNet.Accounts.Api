import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';
import type { PostingsPanelRow } from './PostingsPanel';

const ACCOUNT: AccountDetailAccount = {
  accountNumber: 'ACME-000123',
  name: 'Operating account',
  currency: 'SGD',
  decimalPlaces: 2,
  balance: '100.00',
  availableBalance: '100.00',
  heldAmount: '0.00',
  floor: '0.00',
  status: 'Active',
  permittedToGoNegative: false,
};

const POSTING: PostingsPanelRow = {
  id: 'p1',
  postingNumber: 'PST0000000001',
  direction: 'Credit',
  amount: '100.00',
  currency: 'SGD',
  decimalPlaces: 2,
  category: 'Transfer',
  status: 'Posted',
  description: 'Opening deposit',
  effectiveDate: '2026-09-01',
};

function renderDetail(grantedScopes: string[] = ['postings.reverse']): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AccountDetail, { account: ACCOUNT, accountId: 'a1', postings: [POSTING], grantedScopes }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountDetail — the write surfaces it composes', () => {
  it('shows the status, the edit form and the postings panel once an account is on screen', () => {
    renderDetail();
    expect(screen.getByTestId('account-status')).toHaveTextContent('Active');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name', { exact: true })).toHaveValue('Operating account');
    expect(screen.getByTestId('postings-panel')).toBeInTheDocument();
  });

  it('offers to reverse a posting only once it is selected', async () => {
    const user = userEvent.setup();
    renderDetail();

    expect(screen.queryByRole('button', { name: 'Reverse' })).toBeNull();
    await user.click(within(screen.getByTestId('postings-panel')).getByText('PST0000000001'));
    expect(screen.getByRole('button', { name: 'Reverse' })).toBeInTheDocument();
  });

  it('renders a plain not-found message for an address naming no account', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetail, { account: null })));
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
    expect(screen.queryByTestId('account-balance')).toBeNull();
  });
});

describe('AccountDetail — saving the edit form (DRK-1704 finding 4)', () => {
  it('carries a changed note through PUT as metadata.notes, even when the name is unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'a1', accountNumber: 'ACME-000123' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write']);

    await user.clear(screen.getByLabelText('Free-form notes'));
    await user.type(screen.getByLabelText('Free-form notes'), 'Reconciled monthly');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/a1', expect.objectContaining({ method: 'PUT' })));
    const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT')!;
    const body = JSON.parse((putCall[1] as RequestInit).body as string);
    expect(body.metadata).toEqual({ notes: 'Reconciled monthly' });
  });
});
