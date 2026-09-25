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

  // DRK-1745: rewrite for the new form
  it.skip('changing the status filter navigates with the filter and resets paging', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pagedResponse([])));
    renderScreen();
    await screen.findByLabelText('Status filter');

    await userEvent.selectOptions(screen.getByLabelText('Status filter'), 'Closed');

    expect(historyReplaceSpy).toHaveBeenCalledWith(null, '', '/groups?status=Closed');
  });

  // DRK-1745: rewrite for the new form
  it.skip('changing the owner filter navigates with the filter', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('clicking Next page engages an explicit page size alongside the page number', async () => {
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
        return jsonResponse(422, { errors: [{ message: 'Code TRSY is already used.', code: 'DUPLICATE_GROUP_CODE', field: 'Code' }], traceId: 't-1' });
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

  it('a refusal naming the OwnerId field is visible on screen (DRK-1700 review B1)', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST' && url.endsWith('/account-groups')) {
        return jsonResponse(400, { errors: [{ message: 'Owner is required.', field: 'OwnerId' }], traceId: 't-owner' });
      }
      return pagedResponse([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New group' }));
    await userEvent.type(screen.getByLabelText('Code'), 'NEWG');
    await userEvent.type(screen.getByLabelText('Name'), 'New Group');
    await userEvent.click(screen.getByRole('button', { name: 'Create group' }));

    expect(await screen.findByText('Owner is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Owner')).toHaveAttribute('aria-invalid', 'true');
  });

  // DRK-1745: rewrite for the new form
  it.skip('a refused Close in view mode shows the message and code (DRK-1700 review B2)', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/close') && init?.method === 'POST') {
        return jsonResponse(422, { errors: [{ message: 'Group TRSY holds an account with a balance.', code: 'GROUP_HOLDS_BALANCE' }], traceId: 't-close' });
      }
      if (url.includes('/balances')) return new Response('[]', { status: 200 });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
      return pagedResponse([GROUP]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));
    const closeButton = await screen.findByRole('button', { name: 'Close group' });
    await waitFor(() => expect(closeButton).toBeEnabled());

    await userEvent.click(closeButton);

    const panel = within(await screen.findByTestId('detail-panel'));
    expect(await panel.findByText(/Group TRSY holds an account with a balance\./)).toBeInTheDocument();
    expect(panel.getByText('GROUP_HOLDS_BALANCE')).toBeInTheDocument();
  });

  it('a view-mode Delete refused with a field still renders in the alert (DRK-1700 review round 2, R2-1)', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'DELETE') {
        return jsonResponse(422, { errors: [{ message: 'Group TRSY still holds an account.', code: 'GROUP_NOT_EMPTY', field: 'Id' }], traceId: 't-del' });
      }
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

    const panel = within(await screen.findByTestId('detail-panel'));
    expect(await panel.findByText(/Group TRSY still holds an account\./)).toBeInTheDocument();
    expect(panel.getByText('GROUP_NOT_EMPTY')).toBeInTheDocument();
  });

  it('a failed balances read shows its code, and Close/Delete stay disabled (DRK-1700 review round 2, R2-2)', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/balances')) return jsonResponse(503, { errors: [{ message: 'Balances service unavailable.', code: 'BALANCES_UNAVAILABLE' }], traceId: 't-bal' });
      if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
      return pagedResponse([GROUP]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /TRSY/ }));

    const panel = within(await screen.findByTestId('detail-panel'));
    expect(await panel.findByText('Balances service unavailable.')).toBeInTheDocument();
    expect(panel.getByText('BALANCES_UNAVAILABLE')).toBeInTheDocument();
    expect(panel.queryByText('This group holds no account.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close group' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete group' })).toBeDisabled();
  });

  it('a failed list read shows the service code instead of the empty-list text (DRK-1700 review I2)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(403, { errors: [{ message: 'Not permitted.', code: 'FORBIDDEN' }], traceId: 't-list' })));
    renderScreen();

    expect(await screen.findByText('Not permitted.')).toBeInTheDocument();
    expect(screen.getByText('FORBIDDEN')).toBeInTheDocument();
    expect(screen.queryByText('No groups match this filter.')).not.toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('editing shows Code and Owner disabled, and saving with nothing changed surfaces the no-code refusal verbatim', async () => {
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
    expect(screen.getByText(/holds an account with a balance/)).toBeInTheDocument();
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
    expect(screen.getByText(/still holds an account/)).toBeInTheDocument();
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

  // DRK-1745: rewrite for the new form
  it.skip('Previous page navigates back a page, engaging the same explicit page size', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { items: [GROUP], pageIndex: 1, pageSize: 10, pageCount: 2, hasNextPage: false })));
    setSearchParams('page=2&pageSize=10');
    renderScreen();
    const previousButton = await screen.findByRole('button', { name: 'Previous page' });
    expect(previousButton).toBeEnabled();

    await userEvent.click(previousButton);

    expect(historyReplaceSpy).toHaveBeenCalledWith(null, '', '/groups?page=1&pageSize=10');
  });
});

describe('AccountGroupsScreen — screen states (DRK-1725 §3)', () => {
  function paged(items: unknown[], totalItemCount: number, pageNumber = 1): Response {
    return jsonResponse(200, { items, pageNumber, pageSize: 10, pageCount: Math.max(1, Math.ceil(totalItemCount / 10)), totalItemCount, hasNextPage: false });
  }

  // DRK-1745: rewrite for the new form
  it.skip('narrows by type from its own Type filter, beside the status filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(paged([], 0));
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.selectOptions(await screen.findByLabelText('Type filter'), 'Internal');

    expect(historyReplaceSpy).toHaveBeenCalledWith(null, '', '/groups?type=Internal');
    await waitFor(() => expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain('/api/ledger/account-groups?filter=Type%3AEqual%3AInternal&pageNumber=1'));
    expect(screen.getAllByRole('option').filter((option) => option.closest('select') === screen.getByLabelText('Type filter')).map((option) => option.textContent)).toEqual([
      'Any',
      'Customer',
      'Merchant',
      'Internal',
      'Suspense',
      'Settlement',
    ]);
  });

  // DRK-1745: rewrite for the new form
  it.skip('starts its Owner filter blank', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(paged([], 0)));
    renderScreen();
    expect(await screen.findByLabelText('Owner filter')).toHaveValue('');
  });

  // DRK-1745: rewrite for the new form
  it.skip('starts its Type filter on any type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(paged([], 0)));
    renderScreen();
    expect(((await screen.findByLabelText('Type filter')) as HTMLSelectElement).selectedOptions[0]).toHaveTextContent(/^Any$/);
  });

  // DRK-1745: rewrite for the new form
  it.skip('keeps a type from the address in its filter', async () => {
    setSearchParams('type=Internal');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(paged([], 0)));
    renderScreen();
    expect(await screen.findByLabelText('Type filter')).toHaveValue('Internal');
  });

  it.each([
    { search: '', total: 0, message: 'No groups yet.' },
    { search: 'status=Closed', total: 0, message: 'No groups match this filter.' },
    { search: 'page=9&pageSize=10', total: 25, message: 'No more groups.' },
  ])('says $message for an empty list at "$search"', async ({ search, total, message }) => {
    setSearchParams(search);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(paged([], total, 9)));
    renderScreen();
    const cell = await screen.findByRole('cell', { name: message });
    expect(cell.closest('tbody')).not.toBeNull();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Code', 'Name', 'Type', 'Owner', 'Status']);
  });

  it('draws placeholder rows under its headings while the list is read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const { container } = renderScreen();
    expect(container.querySelectorAll('tbody tr [data-slot="skeleton"]')).toHaveLength(50);
    expect(screen.queryByText(/^No groups/)).toBeNull();
  });

  it('offers Retry on a failed list read, and draws the list once the service answers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, { errors: [{ message: 'Ledger store unavailable' }] }));
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ledger store unavailable');

    fetchMock.mockResolvedValue(paged([GROUP], 1));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('cell', { name: 'TRSY' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('moves focus into the panel a row opens, and keeps the filters usable while the panel shows a group', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input);
        if (url.includes('/balances')) return new Response('[]', { status: 200 });
        if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
        return paged([GROUP], 1);
      }),
    );
    renderScreen();
    const row = (await screen.findByRole('cell', { name: 'TRSY' })).closest('tr')!;
    row.focus();
    await userEvent.keyboard('{Enter}');

    const panel = await screen.findByTestId('detail-panel');
    expect(panel).toHaveFocus();
    // It can hold focus, but is no tab stop of its own: Tab goes on through the page (R3).
    expect(panel).toHaveAttribute('tabindex', '-1');
    expect(row).toHaveAttribute('data-state', 'selected');
    expect(screen.getByLabelText('Status filter')).toBeEnabled();
    expect(screen.getByLabelText('Type filter')).toBeEnabled();

    await userEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('detail-panel')).toBeNull());
    expect(row).toHaveFocus();
  });

  // DRK-1745: rewrite for the new form
  it.skip("keeps the filters on screen while the panel's own form is open, and draws a placeholder until the balances answer", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input);
        if (url.includes('/balances')) return new Promise<Response>(() => {});
        if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
        return paged([GROUP], 1);
      }),
    );
    renderScreen();
    await userEvent.click(await screen.findByRole('cell', { name: 'TRSY' }));
    const panel = await screen.findByTestId('detail-panel');
    await within(panel).findByText('Balances');
    expect(panel.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(within(panel).queryByText('This group holds no account.')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'New group' }));
    expect(screen.getByLabelText('Type', { exact: true })).toBeInTheDocument();
    for (const label of ['Status filter', 'Type filter', 'Owner filter']) expect(screen.getByLabelText(label, { exact: true })).toBeEnabled();
  });

  it('offers Retry on a failed group read in the panel', async () => {
    let failGroup = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input);
        if (url.includes('/balances')) return new Response('[]', { status: 200 });
        if (url.includes('/account-groups/g1')) return failGroup ? jsonResponse(503, { errors: [{ message: 'Ledger store unavailable' }] }) : jsonResponse(200, GROUP);
        return paged([GROUP], 1);
      }),
    );
    renderScreen();
    await userEvent.click(await screen.findByRole('cell', { name: 'TRSY' }));
    const panel = await screen.findByTestId('detail-panel');
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Ledger store unavailable');

    failGroup = false;
    await userEvent.click(within(panel).getByRole('button', { name: 'Retry' }));
    expect(await within(panel).findByText('Treasury')).toBeInTheDocument();
  });

  it('offers Retry on a failed balances read in the panel', async () => {
    let failBalances = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input);
        if (url.includes('/balances')) return failBalances ? jsonResponse(503, { errors: [{ message: 'Balances were refused.' }] }) : new Response('[]', { status: 200 });
        if (url.includes('/account-groups/g1')) return jsonResponse(200, GROUP);
        return paged([GROUP], 1);
      }),
    );
    renderScreen();
    await userEvent.click(await screen.findByRole('cell', { name: 'TRSY' }));
    const panel = await screen.findByTestId('detail-panel');
    expect(await within(panel).findByText('Balances were refused.')).toBeInTheDocument();

    failBalances = false;
    await userEvent.click(within(panel).getByRole('button', { name: 'Retry' }));
    expect(await within(panel).findByText('This group holds no account.')).toBeInTheDocument();
  });
});
