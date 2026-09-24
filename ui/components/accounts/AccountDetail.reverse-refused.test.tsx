/**
 * DRK-1713 §5 — the 2 "detail screen of GLOBEX-000456" rows of:
 *
 *   @unit
 *   Scenario Outline: Reverse stays on screen but refused
 *     Given the operator Mai is on the <screen>
 *     When she opens <posting>
 *     Then she sees Reverse on screen and disabled
 *     And she reads "<reason>" <code>
 *
 *     Examples:
 *       | screen                       | posting                            | reason                                   | code                              |
 *       | detail screen of GLOBEX-000456 | P-10042, already reversed by P-10077 | Already reversed by P-10077            | with the code POSTING_ALREADY_REVERSED |
 *       | detail screen of GLOBEX-000456 | P-10077, a reversal of P-10042     | This posting is a reversal of P-10042; record a new posting to correct it | with no code |
 *
 * The rows carry the 2 link fields by the service's own names (`reversedByPostingId`,
 * `reversesPostingId` — brief §3 row 14). The linked posting is also answered by the stubbed
 * `GET /api/ledger/postings/{id}`, so the screen may name it from its own rows or by reading
 * it. The "Records screen" rows are `components/records/RecordsScreen.test.tsx`. RED today:
 * the detail screen's `Reverse` is always enabled (brief §2).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';

const GLOBEX_ID = 'a0000000-0000-4000-8000-000000000456';
const P_10001 = 'b0000000-0000-4000-8000-000000010001';
const P_10042 = 'b0000000-0000-4000-8000-000000010042';
const P_10077 = 'b0000000-0000-4000-8000-000000010077';

const GLOBEX: AccountDetailAccount = {
  accountNumber: 'GLOBEX-000456',
  name: 'Globex Treasury',
  currency: 'SGD',
  decimalPlaces: 2,
  balance: '10.00',
  availableBalance: '10.00',
  heldAmount: '0.00',
  floor: '0',
  status: 'Active',
  permittedToGoNegative: false,
};

// Untyped on purpose: the link fields are what brief §3 row 14 adds to the row shape.
const ROWS = [
  { id: P_10001, postingNumber: 'P-10001', direction: 'Credit', amount: '10.00', currency: 'SGD', decimalPlaces: 2, category: 'Transfer', status: 'Posted', effectiveDate: '2026-09-20' },
  { id: P_10042, postingNumber: 'P-10042', direction: 'Credit', amount: '30.00', currency: 'SGD', decimalPlaces: 2, category: 'Transfer', status: 'Reversed', effectiveDate: '2026-09-20', reversedByPostingId: P_10077 },
  { id: P_10077, postingNumber: 'P-10077', direction: 'Debit', amount: '30.00', currency: 'SGD', decimalPlaces: 2, category: 'Reversal', status: 'Posted', description: 'duplicate of the morning batch', effectiveDate: '2026-09-21', reversesPostingId: P_10042 },
];

const DTOS: Record<string, unknown> = {
  [P_10042]: { id: P_10042, postingNumber: 'P-10042', accountId: GLOBEX_ID, streamPosition: 2, direction: 'Credit', amount: '30.00', signedAmount: '30.00', currency: 'SGD', status: 'Reversed', category: 'Transfer', effectiveDate: '2026-09-20', reversedByPostingId: P_10077 },
  [P_10077]: { id: P_10077, postingNumber: 'P-10077', accountId: GLOBEX_ID, streamPosition: 3, direction: 'Debit', amount: '30.00', signedAmount: '-30.00', currency: 'SGD', status: 'Posted', category: 'Reversal', description: 'duplicate of the morning batch', effectiveDate: '2026-09-21', reversesPostingId: P_10042 },
};

function jsonResponse(body: unknown, status = 200): { status: number; ok: boolean; text: () => Promise<string>; json: () => Promise<unknown> } {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body), json: async () => body };
}

function renderDetail(): ReturnType<typeof render> {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      const id = String(url).match(/^\/api\/ledger\/postings\/([^/?]+)$/)?.[1];
      if (id && DTOS[id]) return Promise.resolve(jsonResponse(DTOS[id]));
      return Promise.resolve(jsonResponse({ status: 404, errors: [{ message: `unexpected fetch: ${url}` }] }, 404));
    }),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AccountDetail, {
        account: GLOBEX,
        accountId: GLOBEX_ID,
        grantedScopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write', 'postings.reverse'],
        postings: ROWS,
        postingsFrom: '2026-09-01',
        postingsTo: '2026-09-24',
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Reverse stays on screen but refused — detail screen of GLOBEX-000456', () => {
  it('P-10042, already reversed by P-10077: disabled, "Already reversed by P-10077" with the code POSTING_ALREADY_REVERSED', async () => {
    const { container } = renderDetail();

    fireEvent.click(screen.getByText('P-10042'));

    await waitFor(() => expect(container).toHaveTextContent('Already reversed by P-10077'));
    expect(screen.getByRole('button', { name: 'Reverse' })).toBeDisabled();
    expect(screen.getByText(/\bPOSTING_ALREADY_REVERSED\b/)).toBeInTheDocument();
  });

  it('P-10077, a reversal of P-10042: disabled, "This posting is a reversal of P-10042; record a new posting to correct it" with no code', async () => {
    const { container } = renderDetail();

    fireEvent.click(screen.getByText('P-10077'));

    await waitFor(() => expect(container).toHaveTextContent('This posting is a reversal of P-10042; record a new posting to correct it'));
    expect(screen.getByRole('button', { name: 'Reverse' })).toBeDisabled();
    expect(screen.queryByText(/\b[A-Z]+(?:_[A-Z]+)+\b/)).toBeNull();
  });

  it('the presence half: an ordinary posting offers Reverse enabled', () => {
    renderDetail();

    fireEvent.click(screen.getByText('P-10001'));

    expect(screen.getByRole('button', { name: 'Reverse' })).toBeEnabled();
  });
});
