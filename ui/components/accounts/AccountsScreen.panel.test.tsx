/**
 * DRK-1760 §3 rows 7, 8, 9, 10, 11 — the Accounts side panel on the shared hooks: the floor is the
 * service's own or none, an unsent edit asks before it is dropped, a write disables its action
 * while in flight, and a completed write shows the shared success card.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountsScreen } from './AccountsScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const ACCOUNT_ID = 'a0000000-0000-4000-8000-000000000123';
const ACCOUNT = {
  id: ACCOUNT_ID,
  accountNumber: 'ACME-000123',
  groupId: 'g1',
  name: 'Operating account',
  currency: 'SGD',
  classification: 'Asset',
  balance: '100.00',
  availableBalance: '100.00',
  heldAmount: '0.00',
  status: 'Active',
  openedOn: '2026-01-01',
  permittedToGoNegative: true,
  overdraftLimit: '50000.00',
  minimumBalance: null,
};

type Answer = { status: number; ok: boolean; text: () => Promise<string> };

function answer(body: unknown, status = 200): Answer {
  return { status, ok: status >= 200 && status < 300, text: async () => (body === undefined ? '' : JSON.stringify(body)) };
}

/** The fake ledger: `writes` answers every write (a promise held open keeps it in flight). */
function stubLedger({ balance, writes }: { balance?: () => Promise<Answer>; writes?: (url: string, init: RequestInit) => Promise<Answer> } = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method && init.method !== 'GET') return writes ? writes(url, init) : Promise.resolve(answer(ACCOUNT));
    if (url.endsWith('/balance')) return balance ? balance() : Promise.resolve(answer({ currency: 'SGD', balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', floor: '-50000.00' }));
    if (url.startsWith(`/api/ledger/accounts/${ACCOUNT_ID}`)) return Promise.resolve(answer(ACCOUNT));
    if (url.startsWith('/api/ledger/accounts')) return Promise.resolve(answer({ items: [ACCOUNT], pageNumber: 1, pageSize: 10, pageCount: 1, totalItemCount: 1 }));
    if (url.startsWith('/api/ledger/currencies')) return Promise.resolve(answer([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]));
    if (url.startsWith('/api/ledger/account-groups')) return Promise.resolve(answer({ items: [{ id: 'g1', code: 'ACME', name: 'Acme Corporation' }] }));
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderScreen(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountsScreen, { grantedScopes: ['accounts.read', 'accounts.write'] })));
}

function panel(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Details' });
}

async function openAccount(): Promise<void> {
  await userEvent.click(await screen.findByText('Operating account'));
  await within(panel()).findByText('Floor policy');
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
  mockSearch = '';
});

describe('Accounts side panel — the floor (row 11)', () => {
  it("draws a placeholder while the balance read is outstanding, then the service's floor", async () => {
    let answerBalance!: (answer: Answer) => void;
    stubLedger({ balance: () => new Promise((resolve) => (answerBalance = resolve)) });
    renderScreen();
    await openAccount();

    expect(panel()).not.toHaveTextContent(/Floor\s*[−-]?\d/);
    expect(panel().querySelector('[data-slot="skeleton"]')).not.toBeNull();

    answerBalance(answer({ currency: 'SGD', balance: '100.00', availableBalance: '100.00', heldAmount: '0.00', floor: '-50000.00' }));
    expect(await within(panel()).findByText('Floor −50,000.00 SGD — permitted to go negative, overdraft limit 50,000.00.')).toBeInTheDocument();
  });

  it('states the floor unavailable when the balance read fails', async () => {
    stubLedger({ balance: () => Promise.resolve(answer({ errors: [{ message: 'The balance could not be computed.' }] }, 500)) });
    renderScreen();
    await openAccount();

    expect(await within(panel()).findByText('Floor unavailable — the balance could not be read.')).toBeInTheDocument();
    expect(panel()).not.toHaveTextContent(/Floor\s*[−-]?\d/);
  });
});

describe('Accounts side panel — an unsent edit (row 7)', () => {
  it('asks before an edited name is dropped; keeping editing keeps it, discarding closes the panel', async () => {
    stubLedger();
    renderScreen();
    await openAccount();
    await userEvent.click(within(panel()).getByRole('button', { name: 'Edit account' }));
    await userEvent.clear(within(panel()).getByLabelText('Name'));
    await userEvent.type(within(panel()).getByLabelText('Name'), 'Acme treasury');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Close details' }));
    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(within(panel()).getByLabelText('Name')).toHaveValue('Acme treasury');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Close details' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull();
  });

  it('closes an untouched edit form without asking', async () => {
    stubLedger();
    renderScreen();
    await openAccount();
    await userEvent.click(within(panel()).getByRole('button', { name: 'Edit account' }));

    await userEvent.click(within(panel()).getByRole('button', { name: 'Close details' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull();
  });
});

describe('Accounts side panel — writes (rows 8, 10)', () => {
  it('disables Save changes while the save is in flight, then shows "Changes saved"', async () => {
    const held: Array<() => void> = [];
    const writes = vi.fn((_url: string, _init: RequestInit) => new Promise<Answer>((resolve) => held.push(() => resolve(answer(ACCOUNT)))));
    stubLedger({ writes });
    renderScreen();
    await openAccount();
    await userEvent.click(within(panel()).getByRole('button', { name: 'Edit account' }));
    await userEvent.type(within(panel()).getByLabelText('Name'), ' 2');

    const save = within(panel()).getByRole('button', { name: 'Save changes' });
    await userEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());
    expect(writes).toHaveBeenCalledTimes(1);

    expect(JSON.parse(writes.mock.calls[0][1].body as string)).toEqual({ name: 'Operating account 2' });
    held.shift()!();
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(2));
    held.shift()!();
    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent('Changes saved');
    expect(card).toHaveTextContent('Updated ACME-000123. Group, account number, currency and external reference are unchanged; no posting was made.');
  });

  it('keeps the edit form open with the refusal when the save is refused', async () => {
    stubLedger({
      writes: (_url, init) => Promise.resolve(init.method === 'PUT' ? answer({ errors: [{ message: 'The name is taken.', code: 'DUPLICATE_ACCOUNT_NAME' }] }, 422) : answer(ACCOUNT)),
    });
    renderScreen();
    await openAccount();
    await userEvent.click(within(panel()).getByRole('button', { name: 'Edit account' }));
    await userEvent.type(within(panel()).getByLabelText('Name'), ' 2');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Save changes' }));

    expect(await within(panel()).findByText(/The name is taken\./)).toBeInTheDocument();
    expect(within(panel()).getByLabelText('Name')).toHaveValue('Operating account 2');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('opens an account with one request and shows "Account opened"', async () => {
    const writes = vi.fn(() => Promise.resolve(answer({ ...ACCOUNT, id: 'a0000000-0000-4000-8000-000000000456', accountNumber: 'ACME-000456' })));
    stubLedger({ writes });
    renderScreen();
    await screen.findByText('Operating account');
    await userEvent.click(screen.getByRole('button', { name: 'Open account' }));
    await userEvent.selectOptions(within(panel()).getByLabelText('Group'), 'ACME');
    await userEvent.type(within(panel()).getByLabelText('Name'), 'Acme operating');
    await userEvent.selectOptions(within(panel()).getByLabelText('Currency'), 'SGD');

    await userEvent.dblClick(within(panel()).getByRole('button', { name: 'Open account' }));

    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent('Account opened');
    expect(card).toHaveTextContent('Opened ACME-000456 in SGD at a zero balance.');
    expect(writes).toHaveBeenCalledTimes(1);
    expect(JSON.parse((writes.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({
      groupId: 'g1',
      name: 'Acme operating',
      currency: 'SGD',
      classification: 'Asset',
      permittedToGoNegative: false,
      overdraftLimit: null,
      minimumBalance: null,
    });
  });

  it('shows no refusal and no card when opening is refused with nothing to say', async () => {
    stubLedger({ writes: () => Promise.resolve(answer(undefined, 500)) });
    renderScreen();
    await screen.findByText('Operating account');
    await userEvent.click(screen.getByRole('button', { name: 'Open account' }));
    await userEvent.selectOptions(within(panel()).getByLabelText('Group'), 'ACME');
    await userEvent.type(within(panel()).getByLabelText('Name'), 'Acme operating');
    await userEvent.selectOptions(within(panel()).getByLabelText('Currency'), 'SGD');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Open account' }));

    await waitFor(() => expect(within(panel()).getByRole('button', { name: 'Open account' })).toBeEnabled());
    expect(within(panel()).queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a refusal in the open form and no card when opening is refused', async () => {
    stubLedger({ writes: () => Promise.resolve(answer({ errors: [{ message: 'An overdraft limit is required.', code: 'OVERDRAFT_LIMIT_REQUIRED' }] }, 422)) });
    renderScreen();
    await screen.findByText('Operating account');
    await userEvent.click(screen.getByRole('button', { name: 'Open account' }));
    await userEvent.selectOptions(within(panel()).getByLabelText('Group'), 'ACME');
    await userEvent.type(within(panel()).getByLabelText('Name'), 'Acme operating');
    await userEvent.selectOptions(within(panel()).getByLabelText('Currency'), 'SGD');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Open account' }));

    expect(await within(panel()).findByText(/OVERDRAFT_LIMIT_REQUIRED/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('Accounts — the view in the address (DRK-1760 §3 row 5)', () => {
  it('adds one history entry per narrowing and per search', async () => {
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined);
    stubLedger();
    renderScreen();
    await screen.findByText('Operating account');

    await userEvent.click(screen.getByRole('button', { name: /^Filter/ }));
    await userEvent.selectOptions(within(screen.getByRole('group', { name: 'Filters' })).getByLabelText('Currency'), 'SGD');
    expect(push).toHaveBeenLastCalledWith(null, '', '/accounts?currency=SGD');
    await userEvent.keyboard('{Escape}');

    await userEvent.type(screen.getByPlaceholderText('Search number, name or reference'), 'a');
    expect(push).toHaveBeenLastCalledWith(null, '', '/accounts?currency=SGD&search=a');
    expect(push).toHaveBeenCalledTimes(2);
    push.mockRestore();
  });
});
