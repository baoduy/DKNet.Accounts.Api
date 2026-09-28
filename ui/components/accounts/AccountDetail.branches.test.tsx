import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';

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




afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountDetail — the write surfaces it composes', () => {

  // DRK-1760 §3 row 11: the browser never works a floor out — no service figure, no figure.
  it('draws a placeholder, not a floor worked out from the policy, when the service has not stated one', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AccountDetail, {
          account: { ...ACCOUNT, floor: undefined, permittedToGoNegative: true, overdraftLimit: '500.00', minimumBalance: null },
          accountId: 'a1',
        }),
      ),
    );
    expect(screen.getByTestId('account-floor')).not.toHaveTextContent('500.00');
    expect(screen.getByTestId('account-floor').querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it('states the floor unavailable when the balance read failed', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AccountDetail, {
          account: { ...ACCOUNT, floor: undefined, floorFailed: true, permittedToGoNegative: true, overdraftLimit: '500.00', minimumBalance: null },
          accountId: 'a1',
        }),
      ),
    );
    expect(screen.getByTestId('account-floor')).toHaveTextContent(/^Floor unavailable — the balance could not be read\.$/);
  });

  it('renders a plain not-found message for an address naming no account', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetail, { account: null })));
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
    expect(screen.queryByTestId('account-balance')).toBeNull();
  });
});
