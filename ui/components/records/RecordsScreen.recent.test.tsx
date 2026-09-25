/** DRK-1728 §3 row 8 — opening a posting's details puts it in the operator's recently viewed list. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readRecent } from '@/lib/recent/store';
import { RecordsScreen } from './RecordsScreen';

const MAI = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_ID = 'a0000000-0000-4000-8000-000000000456';
const POSTING_ID = 'b0000000-0000-4000-8000-000000010042';
const POSTING = { id: POSTING_ID, postingNumber: 'P-10042', accountId: ACCOUNT_ID, streamPosition: 1, direction: 'Credit', amount: '30.00', signedAmount: '30.00', currency: 'SGD', status: 'Posted', category: 'Transfer', effectiveDate: '2026-09-20' };

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/records',
}));

function answer(url: string): Promise<Response> {
  const body = url.startsWith('/api/ledger/postings?')
    ? { items: [], pageNumber: 1, pageSize: 10, pageCount: 1, totalItemCount: 0 }
    : url === `/api/ledger/postings/${POSTING_ID}`
      ? POSTING
      : url.startsWith('/api/ledger/currencies')
        ? [{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]
        : { id: ACCOUNT_ID, accountNumber: 'GLOBEX-000456' };
  return Promise.resolve(new Response(JSON.stringify(body)));
}

function renderScreen(directoryObjectId?: string): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RecordsScreen grantedScopes={['postings.read']} directoryObjectId={directoryObjectId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(answer));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockSearch = '';
});

describe('RecordsScreen — recently viewed', () => {
  it("keeps the posting by its id once its details are drawn", async () => {
    mockSearch = `open=${POSTING_ID}`;
    renderScreen(MAI);

    await waitFor(() => expect(screen.getByTestId('detail-panel')).toHaveTextContent('P-10042'));
    expect(readRecent(MAI).map((entry) => [entry.kind, entry.id])).toEqual([['Posting', POSTING_ID]]);
  });

  it('keeps nothing while no posting is open', async () => {
    renderScreen(MAI);

    await waitFor(() => expect(screen.getByText(/^No postings between /)).toBeInTheDocument());
    expect(readRecent(MAI)).toEqual([]);
  });

  it('keeps nothing when no operator is named', async () => {
    mockSearch = `open=${POSTING_ID}`;
    renderScreen();

    await waitFor(() => expect(screen.getByTestId('detail-panel')).toHaveTextContent('P-10042'));
    expect(localStorage.getItem('recently-viewed:undefined')).toBeNull();
  });
});
