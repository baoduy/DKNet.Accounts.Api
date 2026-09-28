/**
 * DRK-1704 rework, finding 12 — mutation-survivor disposition for `AccountsScreen.tsx`
 * (additive coverage beside `AccountsScreen.test.tsx`, the build-owned unit test).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountsScreen } from './AccountsScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

function jsonResponse(body: unknown, status = 200): { status: number; ok: boolean; text: () => Promise<string>; json: () => Promise<unknown> } {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body), json: async () => body };
}

const ACCOUNTS_PAGE = {
  items: [{ accountNumber: 'ACME-000123', name: 'Operating account', currency: 'SGD', balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', status: 'Active', openedOn: '2026-01-01' }],
  pageNumber: 1,
  pageSize: 10,
  pageCount: 1,
  totalItemCount: 1,
};
const CURRENCIES = [{ code: 'SGD', decimalPlaces: 2 }];
const GROUPS = [{ id: 'g1', code: 'ACME', name: 'ACME Group' }];

function fetchDispatcher(url: string): ReturnType<typeof jsonResponse> {
  if (url.includes('/api/ledger/accounts')) return jsonResponse(ACCOUNTS_PAGE);
  if (url.includes('/api/ledger/currencies')) return jsonResponse(CURRENCIES);
  if (url.includes('/api/ledger/account-groups')) return jsonResponse({ items: GROUPS });
  throw new Error(`unexpected fetch: ${url}`);
}

function renderScreen(grantedScopes: string[] = ['accounts.write']): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountsScreen, { grantedScopes })));
}

afterEach(() => {
  vi.unstubAllGlobals();
  mockSearch = '';
});

describe('AccountsScreen — sorting toggles through ascending, descending and back', () => {
  it('sends no desc flag first, desc=true on the second click, then drops it again on the third', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByText('Operating account')).toBeInTheDocument());
    const nameHeaderButton = screen.getByRole('columnheader', { name: /Name/ }).querySelector('button')!;

    await user.click(nameHeaderButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('orderBy=name')));
    expect(fetchMock.mock.calls.some(([url]: any[]) => url.includes('desc=true'))).toBe(false);

    await user.click(nameHeaderButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('desc=true')));

    await user.click(nameHeaderButton);
    await waitFor(() =>
      expect(
        fetchMock.mock.calls
          .filter(([url]: any[]) => url.includes('orderBy=name'))
          .at(-1)![0] as string,
      ).not.toContain('desc=true'),
    );
  });
});

describe('AccountsScreen — a refused list read', () => {
  it("shows the service's own refusal wording, not a blanked-out alert", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ledger/accounts')) return Promise.resolve(jsonResponse({ status: 401, errors: [{ message: 'Not signed in.' }] }, 401));
        return Promise.resolve(fetchDispatcher(url));
      }),
    );
    renderScreen();

    await waitFor(() => expect(screen.getByText('Not signed in.')).toBeInTheDocument());
  });
});

describe('AccountsScreen — review round 2', () => {

  it('draws no amount, never a guessed 2 places, while the currency scale is unknown (nit 4)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ledger/currencies')) return new Promise(() => {});
        return Promise.resolve(fetchDispatcher(url));
      }),
    );
    renderScreen();

    await waitFor(() => expect(screen.getByText('Operating account')).toBeInTheDocument());
    expect(screen.queryByText('100.00 SGD')).toBeNull();
    expect(screen.queryByText('100.00')).toBeNull();
  });

  it("shows a refused currency read in the service's own words, the list still on screen (nit 4)", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ledger/currencies')) return Promise.resolve(jsonResponse({ errors: [{ message: 'The currency list is unavailable.', code: 'CURRENCIES_DOWN' }], traceId: 't-9' }, 503));
        return Promise.resolve(fetchDispatcher(url));
      }),
    );
    renderScreen();

    await waitFor(() => expect(screen.getByText('The currency list is unavailable.')).toBeInTheDocument());
    expect(screen.getByText('CURRENCIES_DOWN')).toBeInTheDocument();
    expect(screen.getByText(/t-9/)).toBeInTheDocument();
    expect(screen.getByText('Operating account')).toBeInTheDocument();
    expect(screen.queryByText('100.00')).toBeNull();
  });
});
