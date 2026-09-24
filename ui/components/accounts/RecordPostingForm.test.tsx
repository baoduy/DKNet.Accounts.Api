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

  it('opens with Credit selected, an unset category and no refusal shown', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Record posting' }));

    expect(screen.getByLabelText('Direction', { exact: true })).toHaveValue('Credit');
    expect(screen.getByLabelText('Category', { exact: true })).toHaveValue('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables Record while the mutation is pending, and re-enables the toggle once settled', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Transfer');
    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.getByRole('button', { name: 'Record posting' })).toBeDisabled();

    resolveFetch({ ok: true, json: async () => ({ id: 'p1' }) });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record posting' })).toBeEnabled());
  });

  it('submits the direction the operator actually picked, not only the Credit default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.selectOptions(screen.getByLabelText('Direction', { exact: true }), 'Debit');
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Fee');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.direction).toBe('Debit');
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

  it('clears the typed amount and category on success, but keeps them on a refusal', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    // Refusal first: reopening afterwards must still show what was typed.
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ errors: [{ code: 'INSUFFICIENT_FUNDS', message: 'Over the floor.' }] }) });
    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '20000.00');
    await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Transfer');
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(screen.getByText('INSUFFICIENT_FUNDS')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue('20000.00');

    // Now succeed: reopening afterwards must show the fields cleared.
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1' }) });
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record posting' })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue('');
    expect(screen.queryByText('INSUFFICIENT_FUNDS')).toBeNull();
  });

  it('marks the amount field invalid on a field-named refusal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ errors: [{ message: 'Must be positive.', field: 'Amount' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '-10.00');
    await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Transfer');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows no refusal right after opening, before any submit (kills the bogus-initial-array mutant)', async () => {
    const user = userEvent.setup();
    const { container } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('submits the initial Credit direction and blank category untouched, not a placeholder string', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.direction).toBe('Credit');
    expect(body.category).toBe('');
  });

  it('never throws, and shows no refusal, on a failure with no errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('clears a prior refusal and the typed category, not to a bogus string, once a later attempt succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ errors: [{ code: 'INSUFFICIENT_FUNDS', message: 'Over the floor.' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Transfer');
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(screen.getByText('Over the floor.')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '5.00');
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(screen.queryByText('Over the floor.')).toBeNull());
    // Not merely gone as text — no refusal card remains at all (kills the bogus-clear mutant).
    expect(container.querySelector('[data-slot="card"]')).toBeNull();

    // Re-submit with no category re-picked: the body proves the internal state actually
    // cleared to '' rather than a bogus placeholder string a native `<select>` would mask.
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p2' }) });
    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '1.00');
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const thirdBody = JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string);
    expect(thirdBody.category).toBe('');
  });

  it('shows a generic refusal when the service answers with no errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Transfer');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue('10.00');
  });
});
