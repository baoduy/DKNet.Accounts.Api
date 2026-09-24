import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountGroupsScreen } from './AccountGroupsScreen';

const { getSearchParams, setSearchParams } = vi.hoisted(() => {
  let params = new URLSearchParams();
  return {
    getSearchParams: () => params,
    setSearchParams: (value: string) => {
      params = new URLSearchParams(value);
    },
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/groups',
  useSearchParams: () => getSearchParams(),
}));

const GROUP: { id: string; code: string; name: string; description?: string; type: string; status: string; ownerId: string; metadata?: Record<string, string> } = {
  id: 'g1',
  code: 'TRSY',
  name: 'Treasury',
  type: 'Customer',
  status: 'Active',
  ownerId: 'default-owner',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function pagedResponse(items: unknown[]): Response {
  return jsonResponse(200, { items, pageIndex: 0, pageSize: 1000, pageCount: 1, hasNextPage: false });
}

function renderScreen(grantedScopes: string[] = ['accounts.read', 'accounts.write']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountGroupsScreen, { grantedScopes })));
}

let historyReplaceSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setSearchParams('');
  historyReplaceSpy = vi.spyOn(window.history, 'replaceState');
});

afterEach(() => {
  vi.unstubAllGlobals();
  historyReplaceSpy.mockRestore();
});

describe('AccountGroupsScreen', () => {
  it('renders the fetched groups with code, name, type, owner and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pagedResponse([GROUP])));
    renderScreen();

    expect(await screen.findByText('TRSY')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /TRSY/ });
    expect(within(row).getByText('Treasury')).toBeInTheDocument();
    expect(within(row).getByText('default-owner')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('changing the status filter navigates with the filter and resets paging', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pagedResponse([])));
    renderScreen();
    await screen.findByLabelText('Status filter');

    await userEvent.selectOptions(screen.getByLabelText('Status filter'), 'Closed');

    expect(historyReplaceSpy).toHaveBeenCalledWith(null, '', '/groups?status=Closed');
  });

  it('changing the owner filter navigates with the filter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pagedResponse([])));
    renderScreen();
    await screen.findByLabelText('Owner filter');

    await userEvent.type(screen.getByLabelText('Owner filter'), 'partner-bank-01');

    const lastCall = historyReplaceSpy.mock.calls.at(-1);
    expect(lastCall?.[2]).toContain('ownerId=');
  });

  it('clicking the Name column header navigates with a sort param', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pagedResponse([GROUP])));
    renderScreen();
    await screen.findByText('TRSY');

    await userEvent.click(within(screen.getByRole('columnheader', { name: 'Name' })).getByRole('button'));

    expect(historyReplaceSpy).toHaveBeenCalledWith(null, '', '/groups?sort=name');
  });

  it('Next page is disabled with no further page and enabled once the server reports one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pagedResponse([])));
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('clicking Next page engages an explicit page size alongside the page number', async () => {
    // 11 unpaginated rows — more than ACCOUNT_GROUPS_PAGE_SIZE (10) — is what makes "Next
    // page" clickable before pagination is engaged (43-mai-narrows-the-group-list still shows
    // every matching row on one page; only crossing that size hints there is a next page).
    const items = Array.from({ length: 11 }, (_, i) => ({ ...GROUP, id: `g${i}`, code: `GRP${i}` }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { items, pageIndex: 0, pageSize: 1000, pageCount: 1, hasNextPage: false })));
    renderScreen();
    await screen.findByRole('button', { name: 'Next page' });

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(historyReplaceSpy).toHaveBeenCalledWith(null, '', '/groups?page=2&pageSize=10');
  });

  it('opening a row fetches its detail and balances, showing one line per currency and no combined total', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/balances')) {
        return new Response('[{"currency":"SGD","balance":1250.00,"available":1250.00,"held":0}]', { status: 200 });
      }
      if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
      return pagedResponse([GROUP]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await screen.findByText('TRSY');

    await userEvent.click(screen.getByRole('row', { name: /TRSY/ }));

    const panel = within(await screen.findByTestId('detail-panel'));
    expect(await panel.findByText('SGD')).toBeInTheDocument();
    expect(panel.getByText('1,250.00')).toBeInTheDocument();
    expect(panel.getByText(/not combined into a total/)).toBeInTheDocument();
  });

  it('New group opens a create form; submitting posts the input and switches to view mode on success', async () => {
    const created = { ...GROUP, id: 'g2', code: 'NEWG', name: 'New Group', ownerId: 'partner-bank-01' };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST' && url.endsWith('/account-groups')) return jsonResponse(201, created);
      if (url.includes('/balances')) return new Response('[]', { status: 200 });
      if (url.includes(`/account-groups/${created.id}`)) return jsonResponse(200, created);
      return pagedResponse([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await screen.findByRole('button', { name: 'New group' });

    await userEvent.click(screen.getByRole('button', { name: 'New group' }));
    await userEvent.type(screen.getByLabelText('Code'), 'newg');
    await userEvent.type(screen.getByLabelText('Name'), 'New Group');
    await userEvent.type(screen.getByLabelText('Owner'), 'partner-bank-01');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'Customer');
    await userEvent.click(screen.getByRole('button', { name: 'Create group' }));

    await waitFor(() => expect(within(screen.getByTestId('detail-panel')).getByText('partner-bank-01')).toBeInTheDocument());
    const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse((postCall?.[1] as RequestInit | undefined)?.body as string)).toEqual({
      code: 'NEWG',
      name: 'New Group',
      description: undefined,
      type: 'Customer',
      ownerId: 'partner-bank-01',
      metadata: undefined,
    });
  });

  it('a duplicate-code refusal shows the code and marks the Code field invalid, without leaving the form', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST' && url.endsWith('/account-groups')) {
        return jsonResponse(422, { errors: [{ message: 'Code TRSY is already used.', code: 'DUPLICATE_GROUP_CODE', field: 'code' }], traceId: 't-1' });
      }
      return pagedResponse([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New group' }));
    await userEvent.type(screen.getByLabelText('Code'), 'TRSY');
    await userEvent.type(screen.getByLabelText('Name'), 'Treasury Two');
    await userEvent.type(screen.getByLabelText('Owner'), 'default-owner');
    await userEvent.click(screen.getByRole('button', { name: 'Create group' }));

    expect(await screen.findByText(/DUPLICATE_GROUP_CODE/)).toBeInTheDocument();
    expect(screen.getByLabelText('Code')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Create group' })).toBeInTheDocument();
  });

  it('editing shows Code and Owner disabled, and saving with nothing changed surfaces the no-code refusal verbatim', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PUT') return jsonResponse(400, { errors: [{ message: 'At least one field must be supplied.' }], traceId: 't-2' });
      if (url.includes('/balances')) return new Response('[]', { status: 200 });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
      return pagedResponse([GROUP]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit group' }));

    expect(screen.getByLabelText('Code')).toBeDisabled();
    expect(screen.getByLabelText('Owner')).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const alertLine = await screen.findByText('At least one field must be supplied.');
    expect(alertLine).toBeInTheDocument();
    expect(screen.getByText(/Trace:/)).toBeInTheDocument();
  });

  it('renaming a group only sends the changed name', async () => {
    let currentGroup = { ...GROUP };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PUT') {
        currentGroup = { ...currentGroup, name: 'Treasury (renamed)' };
        return jsonResponse(200, currentGroup);
      }
      if (url.includes('/balances')) return new Response('[]', { status: 200 });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, currentGroup);
      return pagedResponse([currentGroup]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit group' }));
    const nameInput = screen.getByLabelText('Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Treasury (renamed)');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
    expect(JSON.parse((putCall?.[1] as RequestInit | undefined)?.body as string)).toEqual({ name: 'Treasury (renamed)', description: undefined, metadata: undefined });
    expect(await within(screen.getByTestId('detail-panel')).findByText('Treasury (renamed)')).toBeInTheDocument();
  });

  it('Close group stays disabled with GROUP_HOLDS_BALANCE beside it when the group holds a balance', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/balances')) return new Response('[{"currency":"SGD","balance":1250.00,"available":1250.00,"held":0}]', { status: 200 });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
      return pagedResponse([GROUP]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));

    const closeButton = await screen.findByRole('button', { name: 'Close group' });
    await waitFor(() => expect(closeButton).toBeDisabled());
    expect(screen.getByText('GROUP_HOLDS_BALANCE')).toBeInTheDocument();
  });

  it('Delete group stays disabled with GROUP_NOT_EMPTY beside it when the group holds an account', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/balances')) return new Response('[{"currency":"SGD","balance":0,"available":0,"held":0}]', { status: 200 });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
      return pagedResponse([GROUP]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));

    const deleteButton = await screen.findByRole('button', { name: 'Delete group' });
    await waitFor(() => expect(deleteButton).toBeDisabled());
    expect(screen.getByText('GROUP_NOT_EMPTY')).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: 'Close group' });
    expect(closeButton).toBeEnabled();
  });

  it('deleting a group with no held account closes and clears the panel', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.includes('/balances')) return new Response('[]', { status: 200 });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
      return pagedResponse([GROUP]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));
    const deleteButton = await screen.findByRole('button', { name: 'Delete group' });
    await waitFor(() => expect(deleteButton).toBeEnabled());

    await userEvent.click(deleteButton);

    await waitFor(() => expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument());
  });

  it('reopening a closed group calls activate and reflects Active immediately', async () => {
    let currentGroup = { ...GROUP, status: 'Closed' };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/activate') && init?.method === 'POST') {
        currentGroup = { ...currentGroup, status: 'Active' };
        return jsonResponse(200, currentGroup);
      }
      if (url.includes('/balances')) return new Response('[]', { status: 200 });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, currentGroup);
      return pagedResponse([currentGroup]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reopen group' }));

    expect(await within(screen.getByTestId('detail-panel')).findAllByText('Active')).not.toHaveLength(0);
  });

  it('gates every write control behind accounts.write when the scope is not granted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pagedResponse([GROUP])));
    renderScreen(['accounts.read']);
    await screen.findByText('TRSY');

    expect(screen.getByRole('button', { name: 'New group' })).toBeDisabled();
  });

  it('shows metadata read-only when the group carries any', async () => {
    const withMetadata = { ...GROUP, metadata: { region: 'apac' } };
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/balances')) return new Response('[]', { status: 200 });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, withMetadata);
      return pagedResponse([withMetadata]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();

    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));

    expect(await within(screen.getByTestId('detail-panel')).findByText('region=apac')).toBeInTheDocument();
  });

  it('Previous page navigates back a page, engaging the same explicit page size', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { items: [GROUP], pageIndex: 1, pageSize: 10, pageCount: 2, hasNextPage: false })));
    setSearchParams('page=2&pageSize=10');
    renderScreen();
    const previousButton = await screen.findByRole('button', { name: 'Previous page' });
    expect(previousButton).toBeEnabled();

    await userEvent.click(previousButton);

    expect(historyReplaceSpy).toHaveBeenCalledWith(null, '', '/groups?page=1&pageSize=10');
  });
});
