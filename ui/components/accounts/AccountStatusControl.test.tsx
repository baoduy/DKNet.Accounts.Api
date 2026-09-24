import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountStatusControl } from './AccountStatusControl';

function renderControl(props: Partial<React.ComponentProps<typeof AccountStatusControl>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AccountStatusControl, {
        accountId: 'a1',
        status: 'Active',
        balance: '0.00',
        currency: 'SGD',
        ...props,
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountStatusControl', () => {
  it('offers to close an active, emptied account', () => {
    renderControl();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
  });

  it('disables closing with the held figure and the code while the account holds money', () => {
    renderControl({ balance: '12400.00' });
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/12,400\.00 SGD/)).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT_HOLDS_BALANCE')).toBeInTheDocument();
  });

  it('offers to reopen a closed account, regardless of balance', () => {
    renderControl({ status: 'Closed', balance: '0.00' });
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeEnabled();
  });

  it('disables the action and states the missing scope when not granted', () => {
    renderControl({ granted: false });
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/accounts\.write/)).toBeInTheDocument();
  });

  it('closes the account through a PATCH carrying the new status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'a1', status: 'Closed' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderControl();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/a1', expect.objectContaining({ method: 'PATCH' })));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.status).toBe('Closed');
  });
});
