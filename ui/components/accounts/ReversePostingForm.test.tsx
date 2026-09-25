import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('shows a field-named refusal on its control rather than in the general alert', async () => {
    // DRK-1713 §3 row 12: an empty reason is now refused before sending, so a reason is typed
    // for the service to refuse by field.
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ errors: [{ message: 'Required.', field: 'Reason' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'duplicate');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('Reason')).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByRole('alert')).toHaveTextContent(/^Required\.$/);
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

  it.each([
    { name: 'a reason of spaces only', reason: '   ', message: 'A reason is required.' },
    { name: 'a reason of 501 characters', reason: 'r'.repeat(501), message: 'The reason may be at most 500 characters.' },
  ])('refuses $name on the reason control and sends nothing (DRK-1713 §3 row 12)', async ({ reason, message }) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: reason } });
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByLabelText('Reason')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert').textContent).toBe(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a reason of exactly 500 characters', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p2' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'r'.repeat(500) } });
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).reason).toBe('r'.repeat(500));
  });

  it('says in its confirmation that a posting is never edited and both postings stay', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));

    expect(screen.getByText('A posting is never edited or deleted. Reversing records an opposing posting and marks this one reversed. Both stay on the account.')).toBeInTheDocument();
  });

  it('is disabled, naming no posting yet, while the posting that reversed this one is still being read', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    renderForm({ reversedByPostingId: 'p9' });

    expect(screen.getByRole('button', { name: 'Reverse' })).toBeDisabled();
    expect(screen.getByText(/^Already reversed by\s*$/)).toBeInTheDocument();
  });

  it('is disabled, naming no posting yet, while the posting this one reverses is still being read', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    renderForm({ reversesPostingId: 'p0' });

    expect(screen.getByRole('button', { name: 'Reverse' })).toBeDisabled();
    expect(screen.getByText('This posting is a reversal of ; record a new posting to correct it')).toBeInTheDocument();
  });

  it.each([
    { amount: '500.00', currency: 'JPY', decimalPlaces: 0, movement: 'Credit 500 JPY to ACME-000123' },
    { amount: '12400.00', currency: 'SGD', decimalPlaces: 2, movement: 'Credit 12,400.00 SGD to ACME-000123' },
  ])('restates the stored $amount $currency at its currency\'s $decimalPlaces places (DRK-1717 F1)', async ({ amount, currency, decimalPlaces, movement }) => {
    const user = userEvent.setup();
    renderForm({ amount, currency, decimalPlaces });

    await user.click(screen.getByRole('button', { name: 'Reverse' }));

    expect(screen.getByRole('dialog').querySelector('p')?.textContent).toBe(movement);
  });

  it('keeps the dialog and the idempotency key when the service never answers, and says so (DRK-1717 F2)', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p2' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'duplicate');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toHaveValue('duplicate');

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const keyOf = (call: number): string => ((fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>)['Idempotency-Key'];
    expect(keyOf(1)).toBe(keyOf(0));
    await waitFor(() => expect(screen.queryByLabelText('Reason')).toBeNull());
  });

  it("says the service did not answer when the pass-through could not reach it, keeping the reason (DRK-1725 §3 row 6)", async () => {
    const unreachable = { ok: false, status: 502, json: async () => ({ status: 502, errors: [{ message: 'The ledger service cannot be reached.' }], traceId: 't' }) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(unreachable));
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    await user.type(screen.getByLabelText('Reason'), 'duplicate');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.')).toBeInTheDocument();
    expect(screen.queryByText('The ledger service cannot be reached.')).toBeNull();
    expect(screen.getByLabelText('Reason')).toHaveValue('duplicate');
  });
});
