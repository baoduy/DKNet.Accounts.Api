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

  it('closes the dialog and resets the reason once the reversal succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p1', status: 'Reversed' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'duplicate');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.queryByLabelText('Reason')).toBeNull());
  });

  it('keeps the dialog open with the typed reason and shows the refusal when it fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ errors: [{ code: 'POSTING_ALREADY_REVERSED', message: 'Already reversed.' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'duplicate');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Already reversed.')).toBeInTheDocument());
    expect(screen.getByLabelText('Reason')).toHaveValue('duplicate');
  });

  it('drops a field-named refusal rather than showing it in the general alert', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ errors: [{ message: 'Required.', field: 'Reason' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText('Required.')).toBeNull();
  });

  it('closes the dialog when Back is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.queryByLabelText('Reason')).toBeNull();
  });

  it('shows no refusal before the dialog is ever opened (kills the bogus-initial-array mutant)', () => {
    const { container } = renderForm();
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('clears the reason to blank, not a placeholder string, once a later attempt succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ errors: [{ code: 'POSTING_ALREADY_REVERSED', message: 'Already reversed.' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1', status: 'Reversed' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'first attempt');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByText('Already reversed.')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.queryByText('Already reversed.')).toBeNull());
    expect(container.querySelector('[data-slot="card"]')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    expect(screen.getByLabelText('Reason')).toHaveValue('');
  });

  it('never throws, and shows no refusal card, on a failure carrying no errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'duplicate');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByLabelText('Reason')).toHaveValue('duplicate');
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('disables the Reverse trigger while the mutation is pending', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'duplicate');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    // The trigger sits behind the still-open dialog, `aria-hidden` by Radix — `hidden: true`
    // reaches it anyway.
    expect(screen.getByRole('button', { name: 'Reverse', hidden: true })).toBeDisabled();

    resolveFetch({ ok: true, json: async () => ({ id: 'p1' }) });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reverse' })).toBeEnabled());
  });
});
