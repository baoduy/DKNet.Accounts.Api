import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordPostingForm } from './RecordPostingForm';

function renderForm(props: Partial<React.ComponentProps<typeof RecordPostingForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(RecordPostingForm, { accountId: 'a1', accountNumber: 'ACME-000123', currency: 'SGD', ...props }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RecordPostingForm', () => {
  it('opens to a locked account and currency, closed until then', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.queryByLabelText('Direction', { exact: true })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Record posting' }));

    expect(screen.getByLabelText('Account', { exact: true })).toBeDisabled();
    expect(screen.getByLabelText('Account', { exact: true })).toHaveValue('ACME-000123');
    expect(screen.getByLabelText('Posting currency')).toHaveValue('SGD');
  });

  it('records a posting and collapses back to the toggle', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.selectOptions(screen.getByLabelText('Direction', { exact: true }), 'Credit');
    await user.type(screen.getByLabelText('Amount', { exact: true }), '500.00');
    await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Transfer');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/postings', expect.objectContaining({ method: 'POST' })));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ accountId: 'a1', direction: 'Credit', amount: '500.00', currency: 'SGD', category: 'Transfer' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record posting' })).toBeEnabled());
    expect(screen.queryByLabelText('Direction', { exact: true })).toBeNull();
  });

  it('shows the service refusal when the write is rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ errors: [{ code: 'INSUFFICIENT_FUNDS', message: 'The debit would take the account past its floor.' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.selectOptions(screen.getByLabelText('Direction', { exact: true }), 'Debit');
    await user.type(screen.getByLabelText('Amount', { exact: true }), '20000.00');
    await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Transfer');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    await waitFor(() => expect(screen.getByText('INSUFFICIENT_FUNDS')).toBeInTheDocument());
  });
});
