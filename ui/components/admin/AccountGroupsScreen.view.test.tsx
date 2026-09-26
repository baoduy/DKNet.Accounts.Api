/**
 * DRK-1760 §3 rows 5, 6, 7, 8, 10 — the account groups screen on the shared hooks: its view lives in
 * the page address (one history entry per change, never a replaced one), an unsent edit asks before
 * it is dropped, every write disables its action while in flight and ends on the shared success card.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountGroupsScreen } from './AccountGroupsScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const ACME = { id: 'g1', code: 'ACME', name: 'Acme Corporation', type: 'Customer', status: 'Active', ownerId: 'treasury-ops', metadata: { region: 'apac' } };
const OLD = { id: 'g2', code: 'OLD', name: 'Old group', type: 'Internal', status: 'Closed', ownerId: 'treasury-ops' };

type Answer = { status: number; ok: boolean; text: () => Promise<string> };

function answer(body: unknown, status = 200): Answer {
  return { status, ok: status >= 200 && status < 300, text: async () => (body === undefined ? '' : JSON.stringify(body)) };
}

let push: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  push = vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockRestore();
  mockSearch = '';
});

function stubLedger({ write }: { write?: (url: string, init: RequestInit) => Promise<Answer> } = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method && init.method !== 'GET') return write ? write(url, init) : Promise.resolve(answer(ACME));
    const [path] = url.split('?');
    if (path === '/api/ledger/account-groups') return Promise.resolve(answer({ items: [ACME, OLD], pageNumber: 1, pageSize: 10, pageCount: 2, totalItemCount: 12, hasNextPage: true }));
    if (path.endsWith('/balances')) return Promise.resolve(answer([]));
    const one = [ACME, OLD].find((group) => path === `/api/ledger/account-groups/${group.id}`);
    if (one) return Promise.resolve(answer(one));
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderScreen(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountGroupsScreen, { grantedScopes: ['accounts.read', 'accounts.write'] })));
}

function lastPush(): string {
  return push.mock.calls.at(-1)?.[2] as string;
}

function listQueries(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/ledger/account-groups?'));
}

async function filters(): Promise<ReturnType<typeof within>> {
  const button = screen.getByRole('button', { name: /^Filter/ });
  if (button.getAttribute('aria-expanded') !== 'true') await userEvent.click(button);
  return within(screen.getByRole('group', { name: 'Filters' }));
}

async function openPanel(): Promise<HTMLElement> {
  mockSearch = 'open=g1';
  renderScreen();
  const panel = await screen.findByTestId('detail-panel');
  await within(panel).findByText('ACME · Acme Corporation');
  return panel;
}

describe('Account groups — the view lives in the address (rows 5, 6)', () => {
  it('opens on the view the address carries and asks the service for exactly that page', async () => {
    mockSearch = 'type=Internal&status=Closed&ownerId=treasury-ops&search=old&sort=-name&page=2&pageSize=5&open=g2';
    const fetchMock = stubLedger();
    renderScreen();

    await within(await screen.findByTestId('detail-panel')).findByText('OLD · Old group');
    const query = new URLSearchParams(listQueries(fetchMock)[0].split('?')[1]);
    expect(query.getAll('filter')).toEqual(['Type:Equal:Internal', 'Status:Equal:Closed', 'OwnerId:Equal:treasury-ops']);
    expect([query.get('search'), query.get('orderBy'), query.get('desc'), query.get('pageNumber'), query.get('pageSize')]).toEqual(['old', 'Name', 'true', '2', '5']);
    expect(screen.getByPlaceholderText('Search code, name or owner')).toHaveValue('old');
    const menu = await filters();
    expect(Array.from((menu.getByLabelText('Status') as HTMLSelectElement).options).map((option) => option.textContent)).toEqual(['Any', 'Active', 'Closed']);
    expect(menu.getByLabelText('Type')).toHaveValue('Internal');
    expect(menu.getByLabelText('Status')).toHaveValue('Closed');
    expect(menu.getByLabelText('Owner filter')).toHaveValue('treasury-ops');
  });

  it('adds one history entry per change and never replaces one', async () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    stubLedger();
    renderScreen();
    await screen.findByText('Acme Corporation');

    await userEvent.selectOptions((await filters()).getByLabelText('Type'), 'Internal');
    expect(lastPush()).toBe('/groups?type=Internal');
    await userEvent.selectOptions((await filters()).getByLabelText('Status'), 'Closed');
    expect(lastPush()).toBe('/groups?type=Internal&status=Closed');
    await userEvent.type((await filters()).getByLabelText('Owner filter'), 't');
    expect(lastPush()).toBe('/groups?type=Internal&status=Closed&ownerId=t');
    await userEvent.keyboard('{Escape}');

    await userEvent.click(within(screen.getByRole('columnheader', { name: 'Name' })).getByRole('button'));
    expect(lastPush()).toBe('/groups?type=Internal&status=Closed&ownerId=t&sort=name');
    await userEvent.click(within(screen.getByRole('columnheader', { name: 'Name' })).getByRole('button'));
    expect(lastPush()).toBe('/groups?type=Internal&status=Closed&ownerId=t&sort=-name');

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(lastPush()).toBe('/groups?type=Internal&status=Closed&ownerId=t&sort=-name&page=2');
    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '25');
    expect(lastPush()).toBe('/groups?type=Internal&status=Closed&ownerId=t&sort=-name&pageSize=25');

    await userEvent.type(screen.getByPlaceholderText('Search code, name or owner'), 'a');
    expect(lastPush()).toBe('/groups?type=Internal&status=Closed&ownerId=t&search=a&sort=-name&pageSize=25');

    await userEvent.click((await filters()).getByRole('button', { name: 'Clear all' }));
    expect(lastPush()).toBe('/groups?search=a&sort=-name&pageSize=25');
    expect(push).toHaveBeenCalledTimes(9);
    expect(replace).not.toHaveBeenCalled();
    replace.mockRestore();
  });

  it('keeps the open group in the address, and drops it when the panel closes', async () => {
    stubLedger();
    renderScreen();
    await userEvent.click(await screen.findByText('Acme Corporation'));
    expect(lastPush()).toBe('/groups?open=g1');

    await userEvent.click(screen.getByText('Acme Corporation', { selector: 'td' }));
    expect(push).toHaveBeenCalledTimes(1);

    await userEvent.click(within(screen.getByTestId('detail-panel')).getByRole('button', { name: 'Close details' }));
    expect(lastPush()).toBe('/groups?');
    expect(screen.queryByTestId('detail-panel')).toBeNull();
  });

  it('closes the panel once Back takes the open group out of the address', async () => {
    stubLedger();
    await openPanel();

    act(() => {
      window.history.replaceState(null, '', '/groups');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.queryByTestId('detail-panel')).toBeNull();
    window.history.replaceState(null, '', '/');
  });
});

describe('Account groups — the panel (rows 7, 10)', () => {
  it('asks before an edit is dropped, from the close control and from Cancel', async () => {
    stubLedger();
    const panel = await openPanel();
    await userEvent.click(within(panel).getByRole('button', { name: 'Edit group' }));
    expect(within(panel).getByRole('textbox', { name: 'Value, row 1' })).toHaveValue('apac');
    expect(within(panel).getByRole('textbox', { name: 'Description' })).toHaveValue('');
    await userEvent.type(within(panel).getByLabelText('Name', { selector: 'input' }), '!');

    await userEvent.click(within(panel).getByRole('button', { name: 'Close details' }));
    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));

    await userEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByTestId('detail-panel')).toBeNull();
  });

  it('closes an untouched edit without asking — the form starts from the group as read', async () => {
    stubLedger();
    const panel = await openPanel();
    await userEvent.click(within(panel).getByRole('button', { name: 'Edit group' }));

    await userEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('detail-panel')).toBeNull();
  });

  it('keeps the close dialog up with its confirm disabled until the service answers, then shows "Group closed"', async () => {
    let answerClose!: (answer: Answer) => void;
    stubLedger({ write: () => new Promise((resolve) => (answerClose = resolve)) });
    const panel = await openPanel();
    const close = within(panel).getByRole('button', { name: 'Close group' });
    await waitFor(() => expect(close).toBeEnabled());

    await userEvent.click(close);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep group open' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(close);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(close);
    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Close group' });
    await userEvent.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    expect(screen.getByRole('dialog', { name: 'Close account group' })).toBeInTheDocument();

    answerClose(answer({ ...ACME, status: 'Closed' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Group closedACME is closed. Existing accounts stay readable; no new account can be opened in it.');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('disables Reopen group while in flight, then shows "Group reopened"', async () => {
    let answerReopen!: (answer: Answer) => void;
    stubLedger({ write: () => new Promise((resolve) => (answerReopen = resolve)) });
    mockSearch = 'open=g2';
    renderScreen();
    const reopen = await within(await screen.findByTestId('detail-panel')).findByRole('button', { name: 'Reopen group' });

    await userEvent.click(reopen);
    await waitFor(() => expect(reopen).toBeDisabled());
    answerReopen(answer({ ...OLD, status: 'Active' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Group reopenedOLD is active again. New accounts can be opened in it.');
  });
});

describe('Account groups — create and save (rows 8, 10)', () => {
  it('disables Create group while in flight, then opens the new group and shows "Group created"', async () => {
    let answerCreate!: (answer: Answer) => void;
    stubLedger({ write: () => new Promise((resolve) => (answerCreate = resolve)) });
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New group' }));
    const panel = screen.getByTestId('detail-panel');
    await userEvent.type(within(panel).getByLabelText('Code'), 'acme');
    await userEvent.type(within(panel).getByLabelText('Name', { selector: 'input' }), 'Acme Corporation');
    await userEvent.type(within(panel).getByLabelText('Owner'), 'treasury-ops');

    const create = within(panel).getByRole('button', { name: 'Create group' });
    await userEvent.click(create);
    await waitFor(() => expect(create).toBeDisabled());
    answerCreate(answer(ACME, 201));

    expect(await screen.findByRole('status')).toHaveTextContent('Group createdCreated ACME — Acme Corporation. No accounts are open in it yet.');
    expect(lastPush()).toBe('/groups?open=g1');
    expect(await within(screen.getByTestId('detail-panel')).findByText('ACME · Acme Corporation')).toBeInTheDocument();
  });

  it('sends only what changed and shows "Changes saved"', async () => {
    const write = vi.fn((_url: string, _init: RequestInit) => Promise.resolve(answer({ ...ACME, name: 'Acme Holdings' })));
    stubLedger({ write });
    const panel = await openPanel();
    await userEvent.click(within(panel).getByRole('button', { name: 'Edit group' }));
    const name = within(panel).getByLabelText('Name', { selector: 'input' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Acme Holdings');

    await userEvent.click(within(panel).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Changes savedUpdated ACME. Code and currency of existing accounts are unaffected.');
    expect(JSON.parse(write.mock.calls[0][1].body as string)).toEqual({ name: 'Acme Holdings' });
  });
});
