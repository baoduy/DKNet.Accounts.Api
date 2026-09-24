/** DRK-1728 §3 row 8 — opening an account's detail puts it in the operator's recently viewed list. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readRecent } from '@/lib/recent/store';
import { AccountDetailScreen } from './AccountDetailScreen';

const MAI = '11111111-1111-4111-8111-111111111111';
const ACCOUNT = { id: 'a1', accountNumber: 'ACME-000123', name: 'Operating', currency: 'SGD', status: 'Active', balance: '1.00', availableBalance: '1.00', heldAmount: '0.00', permittedToGoNegative: false };

function answer(url: string): Promise<Response> {
  const body = url.includes('/accounts?filter=')
    ? { items: url.includes('ACME-000123') ? [ACCOUNT] : [] }
    : url.includes('/balance')
      ? { currency: 'SGD', balance: '1.00', availableBalance: '1.00', heldAmount: '0.00', floor: '0.00' }
      : url.includes('/currencies')
        ? [{ code: 'SGD', decimalPlaces: 2 }]
        : { items: [] };
  return Promise.resolve(new Response(JSON.stringify(body)));
}

function renderScreen(accountNumber: string, directoryObjectId?: string): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AccountDetailScreen accountNumber={accountNumber} grantedScopes={[]} directoryObjectId={directoryObjectId} />
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
});

describe('AccountDetailScreen — recently viewed', () => {
  it('keeps the account by its id once its detail is drawn', async () => {
    renderScreen('ACME-000123', MAI);

    await waitFor(() => expect(screen.getByTestId('account-balance')).toBeInTheDocument());
    expect(readRecent(MAI).map((entry) => [entry.kind, entry.id])).toEqual([['Account', 'a1']]);
  });

  it('keeps nothing for an address that names no account', async () => {
    renderScreen('NOPE-000000', MAI);

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
    expect(readRecent(MAI)).toEqual([]);
  });

  it('keeps nothing when no operator is named', async () => {
    renderScreen('ACME-000123');

    await waitFor(() => expect(screen.getByTestId('account-balance')).toBeInTheDocument());
    expect(localStorage.getItem(`recently-viewed:${MAI}`)).toBeNull();
    expect(localStorage.getItem('recently-viewed:undefined')).toBeNull();
  });
});
