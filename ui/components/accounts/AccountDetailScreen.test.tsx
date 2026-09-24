import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetailScreen } from './AccountDetailScreen';

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

  it("resolves the group id to the group's name (DRK-1704 finding 8)", async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Group')).toHaveValue('ACME Group'));
  });

  it('loads notes from metadata.notes (DRK-1704 finding 4)', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Free-form notes')).toHaveValue('Reconciled monthly'));
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

  it('shows a loading state before the account lookup settles', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    expect(screen.getByText('Loading…')).toBeInTheDocument();
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

  it("carries the account's own overdraft limit and minimum balance through, never nulled (DRK-1704)", async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Smallest permitted balance')).toHaveValue('10.00'));
    expect(screen.getByLabelText('Overdraft limit')).toHaveValue('500.00');
  });

  it('shows the external reference the account actually carries, not blanked to empty', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Outside reference')).toHaveValue('PO-9911'));
  });

  it('shows a blank outside reference, not "Stryker was here!", when the account carries none', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [{ ...ACCOUNT, externalReference: undefined }] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: GROUPS }));
        if (url.includes('/currencies')) return Promise.resolve(jsonResponse(CURRENCIES));
        if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByLabelText('Outside reference')).toHaveValue(''));
  });

  it('never throws, and shows notes blank, for an account with no metadata at all', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [{ ...ACCOUNT, metadata: undefined }] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: GROUPS }));
        if (url.includes('/currencies')) return Promise.resolve(jsonResponse(CURRENCIES));
        if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByLabelText('Free-form notes')).toHaveValue(''));
  });

  it("shows a posting's own description and effective date, not blanked to empty", async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByText('Opening deposit')).toBeInTheDocument());
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();
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
    expect(screen.queryByTestId('postings-panel')).toBeNull();
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

    await waitFor(() => expect(screen.getByTestId('account-balance')).toBeInTheDocument());
    // Exact match, not a substring one — SGD's own 2 decimal places, never USD's 4 (which
    // would also contain the substring "100.00").
    expect(screen.getByTestId('account-balance').textContent).toMatch(/100\.00(?!\d)/);
  });

  it('never crashes on a group with no match, falling back to a blank group name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [ACCOUNT] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups')) return Promise.resolve(jsonResponse({ items: [{ id: 'g9', code: 'OTHER', name: 'Other Group' }] }));
        if (url.includes('/currencies')) return Promise.resolve(jsonResponse(CURRENCIES));
        if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByLabelText('Group')).toHaveValue(''));
  });

  it("finds the account's own group by id, not merely the first one offered", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [ACCOUNT] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups'))
          return Promise.resolve(
            jsonResponse({
              items: [
                { id: 'gX', code: 'WRONG', name: 'Wrong Group' },
                { id: 'g1', code: 'ACME', name: 'ACME Group' },
              ],
            }),
          );
        if (url.includes('/currencies')) return Promise.resolve(jsonResponse(CURRENCIES));
        if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByLabelText('Group')).toHaveValue('ACME Group'));
  });

  it('draws no amount while the currency list is still loading once the account resolves (review round 2 nit 4)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [ACCOUNT] }));
        if (url.includes('/balance')) return Promise.resolve(jsonResponse(BALANCE));
        if (url.includes('/account-groups')) return new Promise(() => {});
        if (url.includes('/currencies')) return new Promise(() => {});
        if (url.includes('/postings')) return Promise.resolve(jsonResponse(POSTINGS_PAGE));
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })));

    await waitFor(() => expect(screen.getByTestId('account-status')).toBeInTheDocument());
    expect(screen.getByTestId('account-balance')).toHaveTextContent(/^Balance$/);
    expect(screen.getByLabelText('Group')).toHaveValue('');
  });

  it('keeps the direction filter set while the operator changes the period, and vice versa (kills the spread-clearing mutants)', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByText('PST0000000001')).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText('Direction filter'), 'Debit');
    expect(screen.getByLabelText('Direction filter')).toHaveValue('Debit');

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-10' } });
    // The direction filter picked a moment ago must survive the period update — a mutant that
    // replaces the setFilter merge with `{}` would wipe it back to the default.
    expect(screen.getByLabelText('Direction filter')).toHaveValue('Debit');
    expect(screen.getByLabelText('To')).toHaveValue('2026-09-10');
  });
  it("shows a refused currency read in the service's own words, and no amount (review round 2 nit 4)", async () => {
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
    expect(screen.getByTestId('account-balance')).toHaveTextContent(/^Balance$/);
  });

  it('carries every metadata key through a notes change, never erasing the others (review round 2 B1)', async () => {
    const seeded = { ...ACCOUNT, metadata: { source: 'core-banking', region: 'SG', notes: 'Reconciled monthly' } };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT' || init?.method === 'PATCH') return Promise.resolve(jsonResponse({ id: 'a1' }));
      if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [seeded] }));
      return dispatch(true)(url);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: ['accounts.write'] })));

    await waitFor(() => expect(screen.getByLabelText('Free-form notes')).toHaveValue('Reconciled monthly'));
    await user.clear(screen.getByLabelText('Free-form notes'));
    await user.type(screen.getByLabelText('Free-form notes'), 'Closed for audit');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const putCall = await waitFor(() => fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT')!);
    expect(JSON.parse((putCall[1] as RequestInit).body as string)).toEqual({ metadata: { source: 'core-banking', region: 'SG', notes: 'Closed for audit' } });
  });
});
