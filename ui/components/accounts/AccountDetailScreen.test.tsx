import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetailScreen } from './AccountDetailScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

function jsonResponse(body: unknown, status = 200): { status: number; ok: boolean; text: () => Promise<string> } {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) };
}

const ACCOUNT = {
  id: 'a1',
  accountNumber: 'ACME-000123',
  name: 'Operating account',
  currency: 'SGD',
  status: 'Active',
  balance: '100.00',
  availableBalance: '100.00',
  heldAmount: '0.00',
  permittedToGoNegative: true,
  overdraftLimit: '500.00',
  minimumBalance: '10.00',
  externalReference: 'PO-9911',
  groupId: 'g1',
  metadata: { notes: 'Reconciled monthly' },
};
const BALANCE = { currency: 'SGD', balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', floor: '0.00' };
const CURRENCIES = [{ code: 'SGD', decimalPlaces: 2 }];
const GROUPS = [{ id: 'g1', code: 'ACME', name: 'ACME Group' }];
const POSTING = {
  id: 'p1',
  postingNumber: 'PST0000000001',
  direction: 'Credit',
  amount: '50.00',
  currency: 'SGD',
  category: 'Transfer',
  status: 'Posted',
  description: 'Opening deposit',
  effectiveDate: '2026-09-01',
};
const POSTINGS_PAGE = { items: [POSTING], pageIndex: 0, pageSize: 1, pageCount: 1, hasNextPage: false };

function dispatch(found: boolean) {
  return (url: string) => {
    if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: found ? [ACCOUNT] : [] }));
    if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
    if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: GROUPS }));
    if (url.includes('/currencies')) return Promise.resolve(jsonResponse(CURRENCIES));
    if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
    throw new Error(`unexpected fetch: ${url}`);
  };
}

function renderScreen(found = true) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(dispatch(found)));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountDetailScreen', () => {
  it('resolves the account number and renders its balance', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByTestId('account-balance')).toHaveTextContent('100.00'));
  });

  it('renders not-found for an address matching no account', async () => {
    renderScreen(false);
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
    expect(screen.queryByTestId('account-balance')).toBeNull();
  });

  it('maps each posting into a postings-panel row', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByText('PST0000000001')).toBeInTheDocument());
  });

  it('shows the service refusal, not "not found", on a refused lookup (DRK-1704 finding 5)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) {
          return Promise.resolve(jsonResponse({ status: 401, errors: [{ message: 'Not signed in.' }] }, 401));
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByText('Not signed in.')).toBeInTheDocument());
    expect(screen.queryByText(/not found/i)).toBeNull();
  });

  it('keeps the placeholders, and never breaks, when the groups answer before the account', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => (url.includes('/account-groups') ? Promise.resolve(jsonResponse({ items: GROUPS })) : new Promise(() => {})));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/account-groups'))).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByTestId('account-balance').querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it('makes no balance or postings call before the account has resolved an id (kills the accountId fallback mutant)', async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls.some(([url]: any[]) => url.includes('/balance'))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]: any[]) => url.includes('/postings'))).toBe(false);
  });

  it('resolves decimalPlaces from the matching currency, not the interface default of 2', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [ACCOUNT] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: GROUPS }));
        if (url.includes('/currencies')) return Promise.resolve(jsonResponse([{ code: 'SGD', decimalPlaces: 4 }]));
        if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByTestId('account-balance')).toHaveTextContent('100.0000'));
  });

  it('shows a blank description and effective date, not "Stryker was here!", when the posting carries none', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [ACCOUNT] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: GROUPS }));
        if (url.includes('/currencies')) return Promise.resolve(jsonResponse(CURRENCIES));
        if (url.includes('/postings')) return Promise.resolve(jsonResponse({ ...POSTINGS_PAGE, items: [{ ...POSTING, description: undefined, effectiveDate: undefined }] }));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByText('PST0000000001')).toBeInTheDocument());
    expect(screen.queryByText('Stryker was here!')).toBeNull();
    expect(screen.queryByText('undefined')).toBeNull();
  });

  it('draws no amount, never a guessed 2 places, for a currency the list does not carry (review round 2 nit 4)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [ACCOUNT] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: GROUPS }));
        if (url.includes('/currencies')) return Promise.resolve(jsonResponse([{ code: 'USD', decimalPlaces: 4 }]));
        if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByTestId('account-status')).toBeInTheDocument());
    expect(screen.getByTestId('account-balance')).toHaveTextContent(/^Balance$/);
    expect(screen.getByTestId('account-floor')).toBeEmptyDOMElement();
    // Drawn loading while the postings are read, then gone: no posting at a guessed scale.
    await waitFor(() => expect(screen.queryByTestId('postings-panel')).toBeNull());
  });

  it("finds the account's own currency by code, not merely the first one offered", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [ACCOUNT] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: GROUPS }));
        if (url.includes('/currencies'))
          return Promise.resolve(
            jsonResponse([
              { code: 'USD', decimalPlaces: 4 },
              { code: 'SGD', decimalPlaces: 2 },
            ]),
          );
        if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByTestId('account-status')).toBeInTheDocument());
    // Exact match, not a substring one — SGD's own 2 decimal places, never USD's 4 (which
    // would also contain the substring "100.00").
    expect(screen.getByTestId('account-balance').textContent).toMatch(/100\.00(?!\d)/);
  });
  it("shows a refused currency read in the service's own words, and the balance at the service's own digits, never a guessed scale (DRK-1725 R2)", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/currencies')) return Promise.resolve(jsonResponse({ errors: [{ message: 'The currency list is unavailable.', code: 'CURRENCIES_DOWN' }], traceId: 't-9' }, 503));
        return dispatch(true)(url);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByText('The currency list is unavailable.')).toBeInTheDocument());
    expect(screen.getByText('CURRENCIES_DOWN')).toBeInTheDocument();
    expect(screen.getByText(/t-9/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('account-balance')).toHaveTextContent(/^Balance100\.00$/));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('AccountDetailScreen — the statement in the address (DRK-1725 §3 row 4)', () => {
  const EMPTY_PAGE = { items: [], pageNumber: 9, pageSize: 10, pageCount: 3, totalItemCount: 25, hasNextPage: false };

  function renderWith(search: string, postings: unknown, account: Record<string, unknown> = ACCOUNT): ReturnType<typeof vi.fn> {
    mockSearch = search;
    window.history.replaceState(null, '', `/accounts/ACME-000123${search ? `?${search}` : ''}`);
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [account] }));
      if (url.includes('/postings')) return Promise.resolve(jsonResponse(postings));
      return dispatch(true)(url);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));
    return fetchMock;
  }

  function postingQueries(fetchMock: ReturnType<typeof vi.fn>): URLSearchParams[] {
    return fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/ledger/postings?')).map((url) => new URLSearchParams(url.split('?')[1]));
  }

  afterEach(() => {
    mockSearch = '';
  });

  it('asks for no page at all when the address names none', async () => {
    const fetchMock = renderWith('', { ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 });
    await waitFor(() => expect(postingQueries(fetchMock)).toHaveLength(1));
    expect(postingQueries(fetchMock)[0].get('pageNumber')).toBeNull();
    expect(postingQueries(fetchMock)[0].get('pageSize')).toBe('10');
  });

  it("adds one history entry per page change, at this account's own address (DRK-1760 §3 row 5)", async () => {
    window.history.replaceState(null, '', '/accounts/ACME-000123');
    const pushState = vi.spyOn(window.history, 'pushState');
    renderWith('', { ...EMPTY_PAGE, pageNumber: 1, pageCount: 3, hasNextPage: true });
    const next = await screen.findByRole('button', { name: 'Next page' });
    await waitFor(() => expect(next).toBeEnabled());

    await userEvent.click(next);

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(null, '', '/accounts/ACME-000123?page=2');
    pushState.mockRestore();
    window.history.replaceState(null, '', '/');
  });

  it('ignores a page in the address that is no page number', async () => {
    const fetchMock = renderWith('page=zero', { ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 });
    await waitFor(() => expect(postingQueries(fetchMock)).toHaveLength(1));
    expect(postingQueries(fetchMock)[0].get('pageNumber')).toBeNull();
  });

  it('says the account has no postings when it never had one and no period was asked for', async () => {
    renderWith('', { ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 }, { ...ACCOUNT, streamPosition: 0 });
    expect(await screen.findByRole('cell', { name: 'No postings recorded on this account.' })).toBeInTheDocument();
  });

  it('names the default period when the account has postings, only none in it', async () => {
    renderWith('', { ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 }, { ...ACCOUNT, streamPosition: 4 });
    expect(await screen.findByRole('cell', { name: /^No postings between \d{1,2} [A-Z][a-z]{2} and \d{1,2} [A-Z][a-z]{2}\.$/ })).toBeInTheDocument();
  });


  it('draws a posting at its currency scale, never at the digits the service wrote', async () => {
    renderWith('', { ...EMPTY_PAGE, items: [{ ...POSTING, amount: '50' }], totalItemCount: 1, pageCount: 1 });
    const row = (await screen.findByText('PST0000000001')).closest('tr')!;
    expect(row).toHaveTextContent('50.00');
  });

  it('states a failed statement read in the postings panel only, with a way to try again', async () => {
    mockSearch = '';
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/postings')) return Promise.resolve(jsonResponse({ errors: [{ message: 'The ledger service cannot be reached.' }] }, 502));
      return dispatch(true)(url);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    const panel = await screen.findByTestId('postings-panel');
    await waitFor(() => expect(within(panel).getByRole('alert')).toHaveTextContent('The ledger service cannot be reached.'));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    await waitFor(() => expect(screen.getByTestId('account-balance')).toHaveTextContent('100.00'));

    fetchMock.mockImplementation(dispatch(true));
    fireEvent.click(within(panel).getByRole('button', { name: 'Retry' }));
    expect(await within(panel).findByText('PST0000000001')).toBeInTheDocument();
  });

  it('states a failed account read where the account would be, with a way to try again', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ errors: [{ message: 'Ledger store unavailable' }] }, 503));
      return dispatch(true)(url);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ledger store unavailable');
    fetchMock.mockImplementation(dispatch(true));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByTestId('account-balance')).toHaveTextContent('100.00'));
  });

  it('offers Retry on a failed currency read, and draws the amounts at their scale once it answers', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      url.includes('/currencies') ? Promise.resolve(jsonResponse({ errors: [{ message: 'Currencies were refused.' }] }, 503)) : dispatch(true)(url),
    );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await screen.findByText('Currencies were refused.');
    fetchMock.mockImplementation(dispatch(true));
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    await waitFor(() => expect(screen.queryByText('Currencies were refused.')).toBeNull());
  });
});
