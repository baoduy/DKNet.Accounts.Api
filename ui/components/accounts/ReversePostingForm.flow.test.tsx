/**
 * DRK-1762 finding 3 — `ReversePostingForm` on the shared write hook: `Reverse` is disabled while the
 * reversal is in flight (`reverse.isPending`), and every answer — a refusal, no answer at all, a
 * reversal that went through — lands where the form states it.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReversePostingForm } from './ReversePostingForm';

const NO_ANSWER = 'The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.';

type Answer = { status: number; ok: boolean; text: () => Promise<string> };

function answer(body: unknown, status: number): Answer {
  return { status, ok: status >= 200 && status < 300, text: async () => (body === undefined ? '' : JSON.stringify(body)) };
}

function renderForm(onReversed = vi.fn(), direction: 'Credit' | 'Debit' = 'Credit'): ReturnType<typeof vi.fn> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ReversePostingForm, {
        accountId: 'a1',
        accountNumber: 'ACME-000123',
        postingId: 'p1',
        postingNumber: 'PST-000001',
        amount: '100.00',
        currency: 'SGD',
        decimalPlaces: 2,
        direction,
        onReversed,
      }),
    ),
  );
  return onReversed;
}

async function enterReason(reason: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Reverse' }));
  if (reason) await userEvent.type(screen.getByPlaceholderText('Why this record is being reversed.'), reason);
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

async function confirm(): Promise<void> {
  await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reverse record' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReversePostingForm — the reason', () => {
  it('asks for a reason, and drops the complaint once one is typed', async () => {
    vi.stubGlobal('fetch', vi.fn());
    renderForm();
    await enterReason('');

    expect(screen.getByRole('alert')).toHaveTextContent('A reason is required.');
    await userEvent.type(screen.getByPlaceholderText('Why this record is being reversed.'), 'x');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refuses a reason longer than 500 characters', async () => {
    vi.stubGlobal('fetch', vi.fn());
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Reverse' }));
    const field = screen.getByPlaceholderText('Why this record is being reversed.');
    await userEvent.click(field);
    await userEvent.paste('x'.repeat(501));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('alert')).toHaveTextContent('The reason may be at most 500 characters.');
  });

  it('restates a debit as the credit that reverses it', async () => {
    vi.stubGlobal('fetch', vi.fn());
    renderForm(vi.fn(), 'Debit');
    await enterReason('Entered twice.');

    expect(within(await screen.findByRole('dialog')).getByText(/Credit/)).toBeInTheDocument();
  });
});

describe('ReversePostingForm — the answer', () => {
  it('disables Reverse while the reversal is in flight, then reports it reversed', async () => {
    let answerReverse!: (answer: Answer) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Answer>((resolve) => (answerReverse = resolve))));
    const onReversed = renderForm();
    await enterReason('Entered twice.');
    await confirm();
    const reverse = screen.getByRole('button', { name: 'Reverse', hidden: true });
    await waitFor(() => expect(reverse).toBeDisabled());

    answerReverse(answer({ id: 'p2' }, 201));

    await waitFor(() => expect(onReversed).toHaveBeenCalledWith({ postingNumber: 'PST-000001', accountNumber: 'ACME-000123' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reverse' })).toBeEnabled());
  });

  it('states that the service did not answer when the pass-through could not reach it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer({ errors: [{ message: 'The ledger service cannot be reached.' }], traceId: 't' }, 502)));
    renderForm();
    await enterReason('Entered twice.');
    await confirm();

    expect(await within(await screen.findByRole('dialog')).findByText(NO_ANSWER, { exact: false })).toBeInTheDocument();
  });

  it('states that the service did not answer when nothing answered at all', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    renderForm();
    await enterReason('Entered twice.');
    await confirm();

    expect(await within(await screen.findByRole('dialog')).findByText(NO_ANSWER, { exact: false })).toBeInTheDocument();
  });

  it('reopens the reason with nothing to show when a refusal carries no errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(undefined, 500)));
    const onReversed = renderForm();
    await enterReason('Entered twice.');
    await confirm();

    const dialog = await screen.findByRole('dialog', { name: 'Reverse record' });
    expect(within(dialog).getByPlaceholderText('Why this record is being reversed.')).toHaveValue('Entered twice.');
    expect(onReversed).not.toHaveBeenCalled();
  });
});
