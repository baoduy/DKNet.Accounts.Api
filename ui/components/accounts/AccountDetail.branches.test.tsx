import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
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

function renderDetail(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AccountDetail, { account: ACCOUNT, accountId: 'a1', postings: [POSTING], grantedScopes: ['postings.reverse'] }),
    ),
  );
}

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
