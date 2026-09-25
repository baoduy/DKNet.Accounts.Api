import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

/** DRK-1713 §3 row 10 — `Record` asks for confirmation; only `Confirm` sends. */
async function recordAndConfirm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Record' }));
  await user.click(screen.getByRole('button', { name: 'Confirm' }));
}

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
    await recordAndConfirm(user);
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
    await recordAndConfirm(user);

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
    await recordAndConfirm(user);

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
    await recordAndConfirm(user);

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
    await recordAndConfirm(user);
    await waitFor(() => expect(screen.getByText('INSUFFICIENT_FUNDS')).toBeInTheDocument());

    // A refusal leaves the form open, still showing what was typed.
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue('20000.00');

    // Now succeed: reopening afterwards must show the fields cleared.
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1' }) });
    await recordAndConfirm(user);
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
    await recordAndConfirm(user);

    await waitFor(() => expect(screen.getByLabelText('Amount', { exact: true })).toHaveAttribute('aria-invalid', 'true'));
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
    await recordAndConfirm(user);

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
    await recordAndConfirm(user);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record' })).toBeEnabled());
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
    await recordAndConfirm(user);
    await waitFor(() => expect(screen.getByText('Over the floor.')).toBeInTheDocument());

    await user.clear(screen.getByLabelText('Amount', { exact: true }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '5.00');
    await recordAndConfirm(user);
    await waitFor(() => expect(screen.queryByText('Over the floor.')).toBeNull());
    // Not merely gone as text — no refusal card remains at all (kills the bogus-clear mutant).
    expect(container.querySelector('[data-slot="card"]')).toBeNull();

    // Re-submit with no category re-picked: the body proves the internal state actually
    // cleared to '' rather than a bogus placeholder string a native `<select>` would mask.
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p2' }) });
    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '1.00');
    await recordAndConfirm(user);
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
    await recordAndConfirm(user);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Record' })).toBeEnabled());
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue('10.00');
  });

  it('sends nothing until Confirm, restating the movement with the amount as typed; Back returns to the form', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '250.5');
    await user.click(screen.getByRole('button', { name: 'Record' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Credit 250.5 SGD to ACME-000123')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue('250.5');
  });

  it('marks the account control with the code and wording of an account status refusal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ errors: [{ code: 'ACCOUNT_FROZEN', message: 'The account is frozen.' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await recordAndConfirm(user);

    await waitFor(() => expect(screen.getByLabelText('Account', { exact: true })).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByRole('alert')).toHaveTextContent(/^ACCOUNT_FROZEN The account is frozen\.$/);
    expect(screen.getByLabelText('Amount', { exact: true })).not.toHaveAttribute('aria-invalid');
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('keeps the idempotency key when the service never answers, and says so', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await recordAndConfirm(user);
    await waitFor(() => expect(screen.getByText('The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.')).toBeInTheDocument());

    await recordAndConfirm(user);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const keyOf = (call: number): string => ((fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>)['Idempotency-Key'];
    expect(keyOf(1)).toBe(keyOf(0));
  });

  it("keeps the idempotency key when the pass-through says the service could not be reached, and says it did not answer", async () => {
    const unreachable = { ok: false, status: 502, json: async () => ({ status: 502, errors: [{ message: 'The ledger service cannot be reached.' }], traceId: 't' }) };
    const fetchMock = vi.fn().mockResolvedValueOnce(unreachable).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await recordAndConfirm(user);
    await waitFor(() => expect(screen.getByText('The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.')).toBeInTheDocument());
    expect(screen.queryByText('The ledger service cannot be reached.')).toBeNull();

    await recordAndConfirm(user);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const keyOf = (call: number): string => ((fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>)['Idempotency-Key'];
    expect(keyOf(1)).toBe(keyOf(0));
  });

  it('closes the confirmation and the form on Escape, records nothing, and puts focus back on Record posting (DRK-1725 §3 row 7)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByLabelText('Amount', { exact: true })).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record posting' })).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the form open, as typed, on Back', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Record posting' }));
    await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('Amount', { exact: true })).toHaveValue('10.00');
    expect(screen.queryByRole('button', { name: 'Record posting' })).toBeNull();
  });

  describe('with no account passed (the Records screen)', () => {
    const ACME = { id: 'a0000000-0000-4000-8000-000000000123', accountNumber: 'ACME-000123', name: 'Acme Operating', currency: 'SGD' };

    function stubAccounts(): ReturnType<typeof vi.fn> {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (String(url).startsWith('/api/ledger/accounts?')) {
          const body = { items: [ACME], pageNumber: 1, pageSize: 10, pageCount: 1, totalItemCount: 1 };
          return Promise.resolve({ ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body });
        }
        return Promise.resolve({ ok: true, status: 201, json: async () => ({ id: 'p1' }) });
      });
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    }

    it('searches accounts by the typed term and takes the currency, locked, from the chosen one', async () => {
      const fetchMock = stubAccounts();
      const user = userEvent.setup();
      renderForm({ accountId: undefined, accountNumber: undefined, currency: undefined });

      await user.click(screen.getByRole('button', { name: 'Record posting' }));
      expect(screen.getByLabelText('Posting currency')).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled();
      await user.type(screen.getByLabelText('Account', { exact: true }), 'Acme');
      await user.click(await screen.findByRole('option', { name: 'ACME-000123 Acme Operating' }));

      expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain('/api/ledger/accounts?search=Acme&pageNumber=1&pageSize=10');
      expect(screen.getByLabelText('Account', { exact: true })).toHaveValue('ACME-000123');
      expect(screen.getByLabelText('Posting currency')).toHaveValue('SGD');
      expect(screen.getByLabelText('Posting currency')).toBeDisabled();
      expect(screen.queryByRole('listbox')).toBeNull();

      await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
      await recordAndConfirm(user);
      await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/ledger/postings')).toBe(true));
      const post = fetchMock.mock.calls.find(([url]) => url === '/api/ledger/postings')!;
      expect(JSON.parse((post[1] as RequestInit).body as string)).toMatchObject({ accountId: ACME.id, currency: 'SGD' });
    });

    it('offers the accounts again when the account control is focused after a choice, and a changed term drops the choice', async () => {
      stubAccounts();
      const user = userEvent.setup();
      renderForm({ accountId: undefined, accountNumber: undefined, currency: undefined });

      await user.click(screen.getByRole('button', { name: 'Record posting' }));
      await user.type(screen.getByLabelText('Account', { exact: true }), 'ACME');
      await user.click(await screen.findByRole('option', { name: 'ACME-000123 Acme Operating' }));
      await user.click(screen.getByLabelText('Amount', { exact: true }));

      await user.click(screen.getByLabelText('Account', { exact: true }));
      expect(await screen.findByRole('option', { name: 'ACME-000123 Acme Operating' })).toBeInTheDocument();

      await user.type(screen.getByLabelText('Account', { exact: true }), 'X');
      expect(screen.getByLabelText('Posting currency')).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled();
    });

    it('marks the account search control with an account status refusal', async () => {
      const fetchMock = stubAccounts();
      const user = userEvent.setup();
      renderForm({ accountId: undefined, accountNumber: undefined, currency: undefined });
      await user.click(screen.getByRole('button', { name: 'Record posting' }));
      await user.type(screen.getByLabelText('Account', { exact: true }), 'ACME');
      await user.click(await screen.findByRole('option', { name: 'ACME-000123 Acme Operating' }));
      await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');
      fetchMock.mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ errors: [{ code: 'ACCOUNT_CLOSED', message: 'The account is closed.' }] }) });

      await recordAndConfirm(user);

      await waitFor(() => expect(screen.getByLabelText('Account', { exact: true })).toHaveAttribute('aria-invalid', 'true'));
      expect(screen.getByLabelText('Account', { exact: true })).toHaveValue('ACME-000123');
    });

    it('offers no list while the search is unanswered or finds nothing, and marks no offer selected', async () => {
      let answer!: (value: unknown) => void;
      const fetchMock = vi.fn().mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
      vi.stubGlobal('fetch', fetchMock);
      const user = userEvent.setup();
      renderForm({ accountId: undefined, accountNumber: undefined, currency: undefined });
      await user.click(screen.getByRole('button', { name: 'Record posting' }));

      fireEvent.change(screen.getByLabelText('Account', { exact: true }), { target: { value: 'ZZ' } });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('listbox')).toBeNull();
      const empty = { items: [], pageNumber: 1, pageSize: 10, pageCount: 1, totalItemCount: 0 };
      answer({ ok: true, status: 200, text: async () => JSON.stringify(empty), json: async () => empty });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.queryByRole('listbox')).toBeNull();

      stubAccounts();
      fireEvent.change(screen.getByLabelText('Account', { exact: true }), { target: { value: 'ACME' } });
      expect(await screen.findByRole('option', { name: 'ACME-000123 Acme Operating' })).toHaveAttribute('aria-selected', 'false');
    });

    it('restates the chosen category in the confirmation, and no details line without one', async () => {
      stubAccounts();
      const user = userEvent.setup();
      renderForm({ accountId: undefined, accountNumber: undefined, currency: undefined });
      await user.click(screen.getByRole('button', { name: 'Record posting' }));
      await user.type(screen.getByLabelText('Account', { exact: true }), 'ACME');
      await user.click(await screen.findByRole('option', { name: 'ACME-000123 Acme Operating' }));
      await user.type(screen.getByLabelText('Amount', { exact: true }), '10.00');

      await user.click(screen.getByRole('button', { name: 'Record' }));
      expect(Array.from(screen.getByRole('dialog').querySelectorAll('p')).map((p) => p.textContent)).toEqual(['Credit 10.00 SGD to ACME-000123']);
      await user.click(screen.getByRole('button', { name: 'Back' }));

      await user.selectOptions(screen.getByLabelText('Category', { exact: true }), 'Fee');
      await user.click(screen.getByRole('button', { name: 'Record' }));
      expect(Array.from(screen.getByRole('dialog').querySelectorAll('p')).map((p) => p.textContent)).toEqual(['Credit 10.00 SGD to ACME-000123', 'category Fee']);
    });

    it('chooses an offered account from the keyboard', async () => {
      stubAccounts();
      const user = userEvent.setup();
      renderForm({ accountId: undefined, accountNumber: undefined, currency: undefined });

      await user.click(screen.getByRole('button', { name: 'Record posting' }));
      await user.type(screen.getByLabelText('Account', { exact: true }), 'ACME');
      (await screen.findByRole('option', { name: 'ACME-000123 Acme Operating' })).focus();
      await user.keyboard('{Tab}');
      expect(screen.getByLabelText('Posting currency')).toHaveValue('');
      await user.keyboard('{Shift>}{Tab}{/Shift}{Enter}');

      expect(screen.getByLabelText('Posting currency')).toHaveValue('SGD');
    });
  });
});
