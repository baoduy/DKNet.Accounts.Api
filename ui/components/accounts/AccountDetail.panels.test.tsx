/**
 * DRK-1760 §3 rows 7, 8 — the account detail page's side panel on the shared hooks: an entered
 * record asks "Discard unsent record?" before it is dropped, and a record or an edit that went
 * through is confirmed by the shared success card.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, useState, type JSX } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';

const ACCOUNT: AccountDetailAccount = {
  accountNumber: 'ACME-000123',
  name: 'Operating account',
  currency: 'SGD',
  decimalPlaces: 2,
  balance: '100.00',
  availableBalance: '100.00',
  heldAmount: '0.00',
  floor: '0.00',
  status: 'Active',
  permittedToGoNegative: false,
  classification: 'Asset',
  notes: 'desk memo',
  metadata: { notes: 'desk memo' },
};

type Answer = { status: number; ok: boolean; text: () => Promise<string> };

function answer(body: unknown, status = 200): Answer {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) };
}

function stubLedger(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method && init.method !== 'GET') return Promise.resolve(answer({ id: 'a1' }, init.method === 'POST' ? 201 : 200));
    if (url.startsWith('/api/ledger/currencies')) return Promise.resolve(answer([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]));
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The detail page with its `?open=` held the way the screen holds it. */
function Page(): JSX.Element {
  const [open, setOpen] = useState<string | undefined>(undefined);
  return <AccountDetail account={ACCOUNT} accountId="a1" grantedScopes={['accounts.write', 'postings.write']} open={open} onOpenChange={setOpen} />;
}

function renderPage(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(Page)));
}

function panel(): HTMLElement {
  return screen.getByTestId('detail-panel');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Account detail — recording a posting', () => {
  it('asks "Discard unsent record?" before an entered record is dropped, including by opening the edit panel', async () => {
    stubLedger();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Record posting' }));
    await userEvent.type(within(panel()).getByLabelText('Amount'), '25.00');

    await userEvent.click(screen.getByRole('button', { name: 'Edit ACME-000123' }));
    expect(screen.getByRole('dialog', { name: 'Discard unsent record?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(within(panel()).getByLabelText('Amount')).toHaveValue('25.00');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard record' }));
    expect(screen.queryByTestId('detail-panel')).toBeNull();
  });

  it('shows "Record posted" once the record went through, and closes the panel', async () => {
    stubLedger();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Record posting' }));
    await userEvent.type(within(panel()).getByLabelText('Amount'), '25.00');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Review movement' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Record posting' }));

    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent('Record posted');
    expect(card).toHaveTextContent('Credit of 25.00 SGD against ACME-000123');
    await waitFor(() => expect(screen.queryByTestId('detail-panel')).toBeNull());

    await userEvent.click(within(card).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('Account detail — editing the account', () => {
  it('shows "Changes saved" once the edit went through', async () => {
    const fetchMock = stubLedger();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Edit ACME-000123' }));
    await userEvent.type(within(panel()).getByLabelText('Name'), ' 2');

    await userEvent.click(within(panel()).getByRole('button', { name: 'Save' }));

    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent('Changes saved');
    expect(card).toHaveTextContent('Updated ACME-000123. Group, account number and currency are unchanged; no posting was made.');
    // Only the name changed, so the notes are not resent (compared against the account as read).
    const put = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
    expect(JSON.parse((put![1] as RequestInit).body as string)).toEqual({ name: 'Operating account 2' });
  });
});
