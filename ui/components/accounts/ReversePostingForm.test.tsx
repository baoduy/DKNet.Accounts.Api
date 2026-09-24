import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReversePostingForm } from './ReversePostingForm';

function renderForm(props: Partial<React.ComponentProps<typeof ReversePostingForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ReversePostingForm, {
        accountId: 'a1',
        accountNumber: 'ACME-000123',
        postingId: 'p1',
        postingNumber: 'PST0000000001',
        amount: '500.00',
        currency: 'SGD',
        direction: 'Credit',
        ...props,
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReversePostingForm', () => {
  it('reverses the posting with the typed reason', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p1', status: 'Reversed' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'duplicate of the morning batch');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/postings/p1/reverse', expect.objectContaining({ method: 'POST' })));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.reason).toBe('duplicate of the morning batch');
  });

  it('disables the action and states the missing scope when not granted', () => {
    renderForm({ granted: false });
    const button = screen.getByRole('button', { name: 'Reverse' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/postings\.reverse/)).toBeInTheDocument();
  });
});
