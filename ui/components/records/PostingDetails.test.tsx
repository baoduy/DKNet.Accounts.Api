/**
 * DRK-1713 §3 row 7 — a posting's details: every field, the link between a posting and its
 * reversal with the reversal's reason, the never-edited statement, and the shared reverse form
 * restating this posting's own direction.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostingDto } from '@/lib/accounts/query';
import { PostingDetails } from './PostingDetails';

const ORIGINAL: PostingDto = { id: 'p-42', postingNumber: 'P-10042', accountId: 'a-1', streamPosition: 1, direction: 'Credit', amount: '30', signedAmount: '30', currency: 'SGD', status: 'Reversed', category: 'Transfer', effectiveDate: '2026-08-10', reversedByPostingId: 'p-77' };
const REVERSAL: PostingDto = { id: 'p-77', postingNumber: 'P-10077', accountId: 'a-1', streamPosition: 2, direction: 'Debit', amount: '30', signedAmount: '-30', currency: 'SGD', status: 'Posted', category: 'Reversal', description: 'duplicate of the morning batch', effectiveDate: '2026-09-20', reversesPostingId: 'p-42' };

function stubPostings(pending = false): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (pending) return new Promise(() => {});
      const posting = [ORIGINAL, REVERSAL].find((candidate) => url === `/api/ledger/postings/${candidate.id}`);
      return Promise.resolve({ ok: !!posting, status: posting ? 200 : 404, text: async () => JSON.stringify(posting ?? { errors: [{ message: 'Not found.' }] }) });
    }),
  );
}

function renderDetails(posting: PostingDto, scale: number | 'unknown' = 2): RenderResult {
  const decimalPlaces = scale === 'unknown' ? undefined : scale;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(PostingDetails, { posting, accountNumber: 'GLOBEX-000456', decimalPlaces, reverseGranted: true })));
}

/** `<dt>` label → its `<dd>` text. */
function fields(container: HTMLElement): Record<string, string> {
  const labels = Array.from(container.querySelectorAll('dt'));
  return Object.fromEntries(labels.map((dt) => [dt.textContent, dt.nextElementSibling?.textContent ?? '']));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PostingDetails', () => {
  it('shows every field of an ordinary posting, its description, the never-edited statement and no link', () => {
    stubPostings();
    const { container } = renderDetails({ ...REVERSAL, id: 'p-1', postingNumber: 'P-1', status: 'Posted', category: 'Payment', description: 'rent', reversesPostingId: undefined });

    expect(fields(container)).toEqual({ Account: 'GLOBEX-000456', Direction: 'Debit', Category: 'Payment', Amount: '30.00 SGD', 'Effective date': '2026-09-20', Status: 'Posted', Description: 'rent' });
    expect(screen.getByText('A posting is never edited or deleted. Reversing records an opposing posting and marks this one reversed. Both stay on the account.')).toBeInTheDocument();
    expect(screen.queryByText(/^Reason:/)).toBeNull();
  });

  it('leaves an absent category and effective date blank, and shows the amount as sent when the scale is unknown', () => {
    stubPostings();
    const { container } = renderDetails({ ...ORIGINAL, category: undefined, effectiveDate: undefined, reversedByPostingId: undefined, status: 'Posted' }, 'unknown');

    expect(fields(container)).toMatchObject({ Category: '', Amount: '30 SGD', 'Effective date': '' });
  });

  it('names the reversal of a reversed posting and shows that reversal\'s reason', async () => {
    stubPostings();
    renderDetails(ORIGINAL);

    expect(await screen.findByText('Reversed by P-10077')).toBeInTheDocument();
    expect(screen.getByText('Reason: duplicate of the morning batch')).toBeInTheDocument();
    expect(screen.queryByText(/^Reverses/)).toBeNull();
  });

  it('names the posting a reversal reverses and shows its own reason, not as a description', async () => {
    stubPostings();
    const { container } = renderDetails(REVERSAL);

    expect(await screen.findByText('Reverses P-10042')).toBeInTheDocument();
    expect(screen.getByText('Reason: duplicate of the morning batch')).toBeInTheDocument();
    expect(fields(container)).not.toHaveProperty('Description');
    expect(screen.queryByText(/^Reversed by/)).toBeNull();
  });

  it('names no linked posting while it is still being read', () => {
    stubPostings(true);
    renderDetails(ORIGINAL);

    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Reversed by ')).toBeInTheDocument();
  });

  it('names no linked posting for a reversal while it is still being read', () => {
    stubPostings(true);
    renderDetails(REVERSAL);

    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Reverses ')).toBeInTheDocument();
  });

  it.each([
    { direction: 'Debit', restated: 'Debit 30 SGD from GLOBEX-000456' },
    { direction: 'Credit', restated: 'Credit 30 SGD to GLOBEX-000456' },
  ])('hands the reverse form this posting\'s own direction ($direction)', async ({ direction, restated }) => {
    stubPostings();
    const user = userEvent.setup();
    renderDetails({ ...ORIGINAL, direction, reversedByPostingId: undefined, status: 'Posted' });

    await user.click(screen.getByRole('button', { name: 'Reverse' }));

    await waitFor(() => expect(screen.getByRole('dialog').querySelector('p')?.textContent).toBe(restated));
  });
});
