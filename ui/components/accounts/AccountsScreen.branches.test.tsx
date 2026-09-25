/**
 * DRK-1704 rework, finding 12 — mutation-survivor disposition for `AccountsScreen.tsx`
 * (additive coverage beside `AccountsScreen.test.tsx`, the build-owned unit test).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
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

describe('AccountsScreen — decimal places resolved from the matching currency', () => {
  it('formats the balance to the currency’s own decimal places, not the interface default of 2', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ledger/currencies')) return Promise.resolve(jsonResponse([{ code: 'SGD', decimalPlaces: 4 }]));
        return Promise.resolve(fetchDispatcher(url));
      }),
    );
    renderScreen();

    await waitFor(() => expect(screen.getByText('100.0000')).toBeInTheDocument());
  });
});

describe('AccountsScreen — the address bar mirrors the exact view state', () => {
  it('pushes the built accounts URL, not a blank or literal placeholder', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('option', { name: 'SGD' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Currency filter'), 'SGD');

    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/accounts?currency=SGD');
  });

  it('drops a cleared filter from the address entirely, never leaving it as an empty value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByText('Operating account')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Search accounts'), 'ab');
    await user.clear(screen.getByLabelText('Search accounts'));

    const lastUrl = pushStateSpy.mock.calls.at(-1)![2] as string;
    expect(lastUrl).not.toContain('search');
  });

  it('keeps an existing filter in place while a second one is added (never wipes the filter set)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('option', { name: 'SGD' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Currency filter'), 'SGD');
    await user.type(screen.getByLabelText('Search accounts'), 'ab');

    expect(screen.getByLabelText('Currency filter')).toHaveValue('SGD');
    expect(screen.getByLabelText('Search accounts')).toHaveValue('ab');
  });
});

describe('AccountsScreen — filters restored from the page address', () => {
  it('shows the search term and currency the address already names, not blanked or a placeholder', async () => {
    mockSearch = 'search=foo&currency=SGD';
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    renderScreen();

    await waitFor(() => expect(screen.getByLabelText('Search accounts')).toHaveValue('foo'));
    await waitFor(() => expect(screen.getByLabelText('Currency filter')).toHaveValue('SGD'));
  });

  it('shows no bogus currency option while the currency list is still loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ledger/currencies')) return new Promise(() => {});
        return Promise.resolve(fetchDispatcher(url));
      }),
    );
    renderScreen();

    await waitFor(() => expect(screen.getByText('Operating account')).toBeInTheDocument());
    expect(within(screen.getByLabelText('Currency filter')).getAllByRole('option')).toHaveLength(1);
  });
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

describe('AccountsScreen — paging', () => {
  it('requests the clicked page number', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/ledger/accounts')) return Promise.resolve(jsonResponse({ ...ACCOUNTS_PAGE, pageCount: 2 }));
      return Promise.resolve(fetchDispatcher(url));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Page 2' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('pageNumber=2')));
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

describe('AccountsScreen — the Open account button placement', () => {
  it('sits pushed to the far end of its row (kills the marginLeft mutants)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Open account' }).closest('span')).toHaveStyle({ marginLeft: 'auto' });
  });
});

describe('AccountsScreen — the Open account dialog defaults', () => {
  it('starts blank and unshadowed by any prior refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));

    expect(screen.getByLabelText('Name', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Free-form notes')).toHaveValue('');
    expect(screen.getByLabelText('Outside reference')).toHaveValue('');
    expect(screen.getByLabelText('Accounting classification')).toHaveValue('Asset');
    expect(screen.getByLabelText('Permitted to go negative')).not.toBeChecked();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows no refusal right after opening, before any submit (kills the bogus-initial-array mutant)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));

    expect(document.body.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('offers no bogus group or currency option while those lists are still loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ledger/currencies')) return new Promise(() => {});
        if (url.includes('/api/ledger/account-groups')) return new Promise(() => {});
        return Promise.resolve(fetchDispatcher(url));
      }),
    );
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));

    expect(within(screen.getByLabelText('Group')).queryAllByRole('option')).toHaveLength(0);
    expect(within(screen.getByLabelText('Currency')).queryAllByRole('option')).toHaveLength(0);
  });

  it("offers the group and currency lists with the service's own labels, not undefined options", async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(fetchDispatcher(url))));
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));

    await waitFor(() => expect(within(screen.getByLabelText('Group')).getByRole('option', { name: 'ACME Group' })).toBeInTheDocument());
    expect(within(screen.getByLabelText('Group')).getByRole('option', { name: 'ACME Group' })).toHaveValue('g1');
    expect(within(screen.getByLabelText('Currency')).getByRole('option', { name: 'SGD' })).toHaveValue('SGD');
  });

  it('submits the values the operator actually chose, not an empty body', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/api/ledger/accounts')) {
        return Promise.resolve(jsonResponse({ id: 'a2', accountNumber: 'ACME-000002', name: 'New account' }, 201));
      }
      return Promise.resolve(fetchDispatcher(url));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));
    await waitFor(() => expect(within(screen.getByLabelText('Group')).getByRole('option')).toBeTruthy());
    await user.type(screen.getByLabelText('Name', { exact: true }), 'New account');
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const postCall = await waitFor(() => fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST')!);
    const body = JSON.parse((postCall[1] as RequestInit).body as string);
    expect(body).toMatchObject({ groupId: 'g1', name: 'New account', currency: 'SGD', classification: 'Asset' });
  });
});

describe('AccountsScreen — a refused open', () => {
  it('shows the refusal and keeps the dialog open, clearing on a later successful open', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/api/ledger/accounts')) {
        return Promise.resolve(jsonResponse({ errors: [{ message: 'The group is archived.' }] }, 422));
      }
      return Promise.resolve(fetchDispatcher(url));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));
    await waitFor(() => expect(within(screen.getByLabelText('Group')).getByRole('option')).toBeTruthy());
    await user.type(screen.getByLabelText('Name', { exact: true }), 'New account');
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts', expect.objectContaining({ method: 'POST' })));
    await waitFor(() => expect(screen.getAllByText('The group is archived.').length).toBeGreaterThan(0));
    expect(screen.getByLabelText('Name', { exact: true })).toBeInTheDocument();

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/api/ledger/accounts')) {
        return Promise.resolve(jsonResponse({ id: 'a2', accountNumber: 'ACME-000002', name: 'New account' }, 201));
      }
      return Promise.resolve(fetchDispatcher(url));
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.queryAllByText('The group is archived.')).toHaveLength(0));
    // Not merely gone as text — no refusal card remains at all (kills the bogus-clear mutant).
    expect(document.body.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('never throws, and shows no refusal, on a failure with no errors array', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/api/ledger/accounts')) {
        return Promise.resolve(jsonResponse({}, 422));
      }
      return Promise.resolve(fetchDispatcher(url));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));
    await waitFor(() => expect(within(screen.getByLabelText('Group')).getByRole('option')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts', expect.objectContaining({ method: 'POST' })));
    expect(document.body.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('keeps a field-named refusal off the general alert, and drains the general alert once the filter runs (kills the identity/never-filter mutants)', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/api/ledger/accounts')) {
        return Promise.resolve(
          jsonResponse({ errors: [{ message: 'Bad name.', field: 'Name' }, { message: 'General busted.' }] }, 422),
        );
      }
      return Promise.resolve(fetchDispatcher(url));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));
    await waitFor(() => expect(within(screen.getByLabelText('Group')).getByRole('option')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Open' }));

    // `Bad name.` is field-scoped: it must render exactly once (beside the Name field), never
    // duplicated into the screen's own top-level `RefusalAlert` too.
    await waitFor(() => expect(screen.getAllByText('Bad name.')).toHaveLength(1));
    // `General busted.` has no field: both the screen's own alert and the form's redundant
    // routing render it — a filter that drops everything (the `() => undefined` mutant) would
    // starve the screen's own alert and leave only one copy.
    expect(screen.getAllByText('General busted.')).toHaveLength(2);
  });
});

describe('AccountsScreen — review round 2', () => {
  it('sends the typed notes as metadata.notes on the open POST (B2)', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return Promise.resolve(jsonResponse({ id: 'a2' }, 201));
      return Promise.resolve(fetchDispatcher(url));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));
    await waitFor(() => expect(within(screen.getByLabelText('Group')).getByRole('option')).toBeTruthy());
    await user.type(screen.getByLabelText('Name', { exact: true }), 'New account');
    await user.type(screen.getByLabelText('Free-form notes'), 'Opened for payroll');
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const postCall = await waitFor(() => fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!);
    expect(JSON.parse((postCall[1] as RequestInit).body as string).metadata).toEqual({ notes: 'Opened for payroll' });
  });

  it('sends no metadata on the open POST when no notes were typed (B2)', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return Promise.resolve(jsonResponse({ id: 'a2' }, 201));
      return Promise.resolve(fetchDispatcher(url));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Open account' }));
    await waitFor(() => expect(within(screen.getByLabelText('Group')).getByRole('option')).toBeTruthy());
    await user.type(screen.getByLabelText('Name', { exact: true }), 'New account');
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const postCall = await waitFor(() => fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!);
    expect(JSON.parse((postCall[1] as RequestInit).body as string)).not.toHaveProperty('metadata');
  });

  it('draws no phantom row while the account list itself is still loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ledger/accounts')) return new Promise(() => {});
        return Promise.resolve(fetchDispatcher(url));
      }),
    );
    renderScreen();

    await waitFor(() => expect(screen.getByRole('option', { name: 'SGD' })).toBeInTheDocument());
    // Placeholder rows under the headings, never an empty-list message (DRK-1725 R1).
    expect(document.querySelectorAll('tbody tr [data-slot="skeleton"]')).toHaveLength(70);
    expect(screen.queryByText(/^No accounts/)).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

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
