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
        decimalPlaces: 2,
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

  it("quotes the service's own figure, never re-scaled to a guessed 2 places, until the scale is known (review round 2 nit 4)", () => {
    renderControl({ balance: '12400.5', decimalPlaces: undefined });
    expect(screen.getByText(/The account holds 12400\.5 SGD/)).toBeInTheDocument();
  });

  it('disables closing on a zero balance that still carries a held amount (DRK-1704 finding 2)', () => {
    renderControl({ balance: '0.00', heldAmount: '50.00' });
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toBeDisabled();
    expect(screen.getByText('ACCOUNT_HOLDS_BALANCE')).toBeInTheDocument();
  });

  it('offers to close a zero balance with no held amount', () => {
    renderControl({ balance: '0.00', heldAmount: '0.00' });
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
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
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'a1', status: 'Closed' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderControl();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/a1', expect.objectContaining({ method: 'PATCH' })));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.status).toBe('Closed');
  });

  it('shows a write refusal from the close control (DRK-1704 finding 3)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ status: 422, errors: [{ message: 'The account holds 50.00 SGD and cannot be closed.', code: 'ACCOUNT_HOLDS_BALANCE' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderControl();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.getAllByText('ACCOUNT_HOLDS_BALANCE').length).toBeGreaterThan(0));
    expect(screen.getByText('The account holds 50.00 SGD and cannot be closed.')).toBeInTheDocument();
  });

  it('disables the button while the mutation is pending, and re-enables it once settled', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderControl();

    const button = screen.getByRole('button', { name: 'Close' });
    await user.click(button);
    expect(button).toBeDisabled();

    resolveFetch({ ok: true, text: async () => JSON.stringify({ id: 'a1', status: 'Closed' }) });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('shows no refusal on first render, before any click (kills the bogus-initial-array mutant)', () => {
    const { container } = renderControl();
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('reopens through a PATCH carrying status Active, not Closed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'a1', status: 'Active' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderControl({ status: 'Closed', balance: '0.00' });

    await user.click(screen.getByRole('button', { name: 'Reopen' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.status).toBe('Active');
  });

  it('never throws, and shows no refusal, on a failure carrying no errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => JSON.stringify({}) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = renderControl();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('clears a prior refusal once a later attempt succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, text: async () => JSON.stringify({ errors: [{ message: 'The account holds a balance.', code: 'ACCOUNT_HOLDS_BALANCE' }] }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ id: 'a1', status: 'Closed' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = renderControl();

    const button = screen.getByRole('button', { name: 'Close' });
    await user.click(button);
    await waitFor(() => expect(screen.getByText('The account holds a balance.')).toBeInTheDocument());

    await user.click(button);
    await waitFor(() => expect(screen.queryByText('The account holds a balance.')).toBeNull());
    // Not merely gone as text — no refusal card remains at all (kills the bogus-clear mutant).
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });
});
