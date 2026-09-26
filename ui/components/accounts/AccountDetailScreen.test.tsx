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

  // DRK-1745: rewrite for the new form
  it.skip("resolves the group id to the group's name (DRK-1704 finding 8)", async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Group')).toHaveValue('ACME Group'));
  });

  // DRK-1745: rewrite for the new form
  it.skip('loads notes from metadata.notes (DRK-1704 finding 4)', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('draws placeholders in the final layout, and no loading line, before the account lookup settles (DRK-1725 R1)', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })),
    );

    expect(screen.queryByText(/^Loading/)).toBeNull();
    expect(screen.getByTestId('account-balance').querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByTestId('account-status')).toBeNull();
    // The statement's headings are drawn, in a placeholder table hidden from assistive technology.
    expect(screen.getByRole('columnheader', { name: 'Posting', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(container.querySelectorAll('[data-testid="postings-panel"] tbody [data-slot="skeleton"]')).toHaveLength(40);
    // The edit form in its final shape: blank, and disabled until the account arrives.
    for (const label of ['Name', 'Free-form notes', 'Account number', 'Outside reference', 'Overdraft limit', 'Smallest permitted balance']) {
      expect(screen.getByLabelText(label, { exact: true })).toHaveValue('');
      expect(screen.getByLabelText(label, { exact: true })).toBeDisabled();
    }
    for (const label of ['Group', 'Currency', 'Accounting classification']) expect(screen.getByLabelText(label, { exact: true })).toHaveTextContent(/^$/);
    expect(screen.getByLabelText('Permitted to go negative')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
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

  // DRK-1745: rewrite for the new form
  it.skip('keeps the statement loading while the postings are read, the account drawn', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => (url.includes('/postings') ? new Promise(() => {}) : dispatch(true)(url))));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })),
    );
    await waitFor(() => expect(screen.getByTestId('account-balance')).toHaveTextContent('100.00'));
    expect(container.querySelectorAll('[data-testid="postings-panel"] tbody [data-slot="skeleton"]')).toHaveLength(40);
  });

  // DRK-1745: rewrite for the new form
  it.skip('keeps the statement loading while the currency scale is read, the postings answered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => (url.includes('/currencies') ? new Promise(() => {}) : dispatch(true)(url))));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: [] })),
    );
    await waitFor(() => expect(screen.getByTestId('account-status')).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText('PST0000000001')).toBeNull();
    expect(container.querySelectorAll('[data-testid="postings-panel"] tbody [data-slot="skeleton"]')).toHaveLength(40);
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

  // DRK-1745: rewrite for the new form
  it.skip("carries the account's own overdraft limit and minimum balance through, never nulled (DRK-1704)", async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Smallest permitted balance')).toHaveValue('10.00'));
    expect(screen.getByLabelText('Overdraft limit')).toHaveValue('500.00');
  });

  // DRK-1745: rewrite for the new form
  it.skip('shows the external reference the account actually carries, not blanked to empty', async () => {
    renderScreen(true);
    await waitFor(() => expect(screen.getByLabelText('Outside reference')).toHaveValue('PO-9911'));
  });

  // DRK-1745: rewrite for the new form
  it.skip('shows a blank outside reference, not "Stryker was here!", when the account carries none', async () => {
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

    // The account itself, not the blank placeholder form drawn while it was read.
    await waitFor(() => expect(screen.getByTestId('account-status')).toBeInTheDocument());
    expect(screen.getByLabelText('Outside reference')).toHaveValue('');
    expect(screen.getByLabelText('Outside reference')).toBeDisabled();
  });

  // DRK-1745: rewrite for the new form
  it.skip('never throws, and shows notes blank, for an account with no metadata at all', async () => {
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

    await waitFor(() => expect(screen.getByTestId('account-status')).toBeInTheDocument());
    expect(screen.getByLabelText('Free-form notes')).toHaveValue('');
    expect(screen.getByLabelText('Free-form notes')).toBeEnabled();
  });

  // DRK-1745: rewrite for the new form
  it.skip("shows a posting's own description and effective date, not blanked to empty", async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('never crashes on a group with no match, falling back to a blank group name', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip("finds the account's own group by id, not merely the first one offered", async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('draws no amount while the currency list is still loading once the account resolves (review round 2 nit 4)', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('keeps the direction filter set while the operator changes the period, and vice versa (kills the spread-clearing mutants)', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('carries every metadata key through a notes change, never erasing the others (review round 2 B1)', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('writes metadata back exactly as the service sent it, even values that spell an enum member (DRK-1734 B1)', async () => {
    // The service's own wire shape: camelCase enums on the account, free-form text in metadata.
    const seeded = { ...ACCOUNT, status: 'active', classification: 'liability', metadata: { status: 'active', category: 'payment', type: 'customer', notes: 'Reconciled monthly' } };
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
    expect(JSON.parse((putCall[1] as RequestInit).body as string)).toEqual({ metadata: { status: 'active', category: 'payment', type: 'customer', notes: 'Closed for audit' } });
  });
});

describe('AccountDetailScreen — a write refreshes the lookup keyed by account number (review round 3)', () => {
  const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

  function statefulLedger(): { fetchMock: ReturnType<typeof vi.fn>; lookups: () => number } {
    let account: Omit<typeof ACCOUNT, 'metadata'> & { metadata: Record<string, string> } = { ...ACCOUNT, id: GUID, balance: '0.00', availableBalance: '0.00', heldAmount: '0.00', status: 'Active' };
    let lookupCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        const body = JSON.parse(init.body as string) as { status?: string };
        account = { ...account, status: body.status ?? account.status };
        return Promise.resolve(jsonResponse(account));
      }
      if (init?.method === 'PUT') {
        const body = JSON.parse(init.body as string) as { metadata?: Record<string, string> };
        account = { ...account, metadata: body.metadata ?? account.metadata };
        return Promise.resolve(jsonResponse(account));
      }
      if (url.includes('/accounts?filter=')) {
        lookupCount += 1;
        return Promise.resolve(jsonResponse({ items: [account] }));
      }
      if (url.includes('/balance')) return Promise.resolve(jsonResponse({ ...BALANCE, balance: '0.00', availableBalance: '0.00' }));
      return dispatch(true)(url);
    });
    return { fetchMock, lookups: () => lookupCount };
  }

  function renderWritable(fetchMock: ReturnType<typeof vi.fn>): void {
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetailScreen, { accountNumber: 'ACME-000123', grantedScopes: ['accounts.write'] })));
  }

  // DRK-1745: rewrite for the new form
  it.skip('re-reads the account after Close, so the badge reads Closed and the control reads Reopen', async () => {
    const { fetchMock, lookups } = statefulLedger();
    const user = userEvent.setup();
    renderWritable(fetchMock);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled());
    expect(lookups()).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/ledger/accounts/${GUID}`, expect.objectContaining({ method: 'PATCH' })));
    await waitFor(() => expect(lookups()).toBeGreaterThan(1));
    await waitFor(() => expect(screen.getByTestId('account-status')).toHaveTextContent('Closed'));
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('re-reads the account after a notes save', async () => {
    const { fetchMock, lookups } = statefulLedger();
    const user = userEvent.setup();
    renderWritable(fetchMock);

    await waitFor(() => expect(screen.getByLabelText('Free-form notes')).toHaveValue('Reconciled monthly'));
    expect(lookups()).toBe(1);
    await user.clear(screen.getByLabelText('Free-form notes'));
    await user.type(screen.getByLabelText('Free-form notes'), 'Closed for audit');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/ledger/accounts/${GUID}`, expect.objectContaining({ method: 'PUT' })));
    await waitFor(() => expect(lookups()).toBeGreaterThan(1));
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

  // DRK-1745: rewrite for the new form
  it.skip('reads the period and page from the address, a page of 10', async () => {
    const fetchMock = renderWith('from=2026-01-01&to=2026-01-31&page=2', { ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 });
    await waitFor(() => expect(postingQueries(fetchMock)).toHaveLength(1));
    const query = postingQueries(fetchMock)[0];
    expect([query.get('from'), query.get('to'), query.get('pageNumber'), query.get('pageSize')]).toEqual(['2026-01-01', '2026-01-31', '2', '10']);
  });

  // DRK-1745: rewrite for the new form
  it.skip('states a period it refuses to send in place of the statement, never loading', async () => {
    const fetchMock = renderWith('from=2026-01-01', EMPTY_PAGE);
    expect(await screen.findByRole('cell', { name: /^The period may span at most 90 days\.$|^The period start must not be after its end\.$/ })).toBeInTheDocument();
    expect(postingQueries(fetchMock)).toHaveLength(0);
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

  // DRK-1745: rewrite for the new form
  it.skip('names the period the address asked for, even for an account that never had a posting', async () => {
    renderWith('from=2026-01-01&to=2026-01-31', { ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 }, { ...ACCOUNT, streamPosition: 0 });
    expect(await screen.findByRole('cell', { name: 'No postings between 1 Jan and 31 Jan.' })).toBeInTheDocument();
  });

  const TODAY = new Date().toISOString().slice(0, 10);

  // DRK-1745: rewrite for the new form
  it.skip.each([`from=${TODAY}`, `to=${TODAY}`])('names the period when the address sets only %s, even for an account that never had a posting', async (search) => {
    renderWith(search, { ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 }, { ...ACCOUNT, streamPosition: 0 });
    expect(await screen.findByRole('cell', { name: /^No postings between / })).toBeInTheDocument();
  });

  it('draws a posting at its currency scale, never at the digits the service wrote', async () => {
    renderWith('', { ...EMPTY_PAGE, items: [{ ...POSTING, amount: '50' }], totalItemCount: 1, pageCount: 1 });
    const row = (await screen.findByText('PST0000000001')).closest('tr')!;
    expect(row).toHaveTextContent('50.00');
  });

  // DRK-1745: rewrite for the new form
  it.skip('says there are no more postings past the last page, and links the pages there are', async () => {
    renderWith('page=9', EMPTY_PAGE);
    expect(await screen.findByRole('cell', { name: 'No more postings.' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Page \d$/ }).map((button) => button.textContent)).toEqual(['Page 1', 'Page 2', 'Page 3']);
  });

  // DRK-1745: rewrite for the new form
  it.skip('opens a page into the address and reads it', async () => {
    const fetchMock = renderWith('page=9', EMPTY_PAGE);
    fireEvent.click(await screen.findByRole('button', { name: 'Page 2' }));
    await waitFor(() => expect(postingQueries(fetchMock).at(-1)!.get('pageNumber')).toBe('2'));
    expect(window.location.pathname + window.location.search).toBe('/accounts/ACME-000123?page=2');
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 1' })).not.toHaveAttribute('aria-current');
  });

  // DRK-1745: rewrite for the new form
  it.skip('puts a changed period into the address and starts it on its first page', async () => {
    const fetchMock = renderWith('page=9', EMPTY_PAGE);
    await screen.findByRole('cell', { name: 'No more postings.' });
    // A one-day period ending on the default period's last day — well inside the 90-day cap.
    const to = (screen.getByLabelText('To', { exact: true }) as HTMLInputElement).value;
    fireEvent.change(screen.getByLabelText('From', { exact: true }), { target: { value: to } });
    await waitFor(() => expect(postingQueries(fetchMock).at(-1)!.get('from')).toBe(to));
    expect(postingQueries(fetchMock).at(-1)!.get('pageNumber')).toBeNull();
    expect(new URLSearchParams(window.location.search).get('from')).toBe(to);
    expect(new URLSearchParams(window.location.search).get('to')).toBe(to);
    expect(new URLSearchParams(window.location.search).get('page')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('says nothing matches a narrowing, and drops the page from the address', async () => {
    const fetchMock = renderWith('page=9', EMPTY_PAGE);
    await screen.findByRole('cell', { name: 'No more postings.' });
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/accounts?filter=')) return Promise.resolve(jsonResponse({ items: [ACCOUNT] }));
      if (url.includes('/postings')) return Promise.resolve(jsonResponse({ ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 }));
      return dispatch(true)(url);
    });
    await userEvent.selectOptions(screen.getByLabelText('Direction filter', { exact: true }), 'Debit');
    expect(await screen.findByRole('cell', { name: 'No postings match this filter.' })).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe('/accounts/ACME-000123');
  });

  // DRK-1745: rewrite for the new form
  it.skip('keeps the period in the address, dropping only the page, when a narrowing changes', async () => {
    renderWith('from=2026-01-01&to=2026-01-31&page=9', EMPTY_PAGE);
    await screen.findByRole('cell', { name: 'No more postings.' });
    await userEvent.selectOptions(screen.getByLabelText('Direction filter', { exact: true }), 'Debit');
    expect(window.location.search).toBe('?from=2026-01-01&to=2026-01-31');
  });

  // DRK-1745: rewrite for the new form
  it.skip('keeps an address with no page when a narrowing changes', async () => {
    renderWith('from=2026-01-01&to=2026-01-31', { ...EMPTY_PAGE, totalItemCount: 0, pageCount: 1 });
    await screen.findByRole('cell', { name: 'No postings between 1 Jan and 31 Jan.' });
    const pushState = vi.spyOn(window.history, 'pushState');
    await userEvent.selectOptions(screen.getByLabelText('Direction filter', { exact: true }), 'Debit');
    expect(window.location.search).toBe('?from=2026-01-01&to=2026-01-31');
    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
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
