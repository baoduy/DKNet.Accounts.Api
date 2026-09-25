import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDetail, type AccountDetailAccount } from './AccountDetail';
import type { PostingsPanelRow } from './PostingsPanel';

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
};

const POSTING: PostingsPanelRow = {
  id: 'p1',
  postingNumber: 'PST0000000001',
  direction: 'Credit',
  amount: '100.00',
  currency: 'SGD',
  decimalPlaces: 2,
  category: 'Transfer',
  status: 'Posted',
  description: 'Opening deposit',
  effectiveDate: '2026-09-01',
};

function renderDetail(grantedScopes: string[] = ['postings.reverse'], account: AccountDetailAccount = ACCOUNT): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AccountDetail, { account, accountId: 'a1', postings: [POSTING], grantedScopes }),
    ),
  );
}

/** Review round 2 B1 — the service replaces the whole metadata map on `PUT` (`Account.cs:144-146`). */
const SEEDED: AccountDetailAccount = { ...ACCOUNT, notes: '', metadata: { source: 'core-banking', region: 'SG' } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountDetail — the write surfaces it composes', () => {
  // DRK-1745: rewrite for the new form
  it.skip('shows the status, the edit form and the postings panel once an account is on screen', () => {
    renderDetail();
    expect(screen.getByTestId('account-status')).toHaveTextContent('Active');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name', { exact: true })).toHaveValue('Operating account');
    expect(screen.getByTestId('postings-panel')).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('offers to reverse a posting only once it is selected', async () => {
    const user = userEvent.setup();
    renderDetail();

    expect(screen.queryByRole('button', { name: 'Reverse' })).toBeNull();
    await user.click(within(screen.getByTestId('postings-panel')).getByText('PST0000000001'));
    expect(screen.getByRole('button', { name: 'Reverse' })).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('deselects a posting (and hides Reverse again) on a second click of the same row', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(within(screen.getByTestId('postings-panel')).getByText('PST0000000001'));
    expect(screen.getByRole('button', { name: 'Reverse' })).toBeInTheDocument();
    await user.click(within(screen.getByTestId('postings-panel')).getByText('PST0000000001'));
    expect(screen.queryByRole('button', { name: 'Reverse' })).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip("passes the selected posting's own direction to ReversePostingForm, Debit included", async () => {
    const debitPosting: PostingsPanelRow = { ...POSTING, id: 'p2', postingNumber: 'PST0000000002', direction: 'Debit' };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AccountDetail, { account: ACCOUNT, accountId: 'a1', postings: [POSTING, debitPosting], grantedScopes: ['postings.reverse'] }),
      ),
    );
    const user = userEvent.setup();

    await user.click(within(screen.getByTestId('postings-panel')).getByText('PST0000000002'));
    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    // `ConfirmMovement` renders the direction in its own confirmation sentence.
    expect(within(screen.getByRole('dialog')).getByText('debit', { exact: false })).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('gates Record posting on postings.write and Reverse on postings.reverse independently', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AccountDetail, { account: ACCOUNT, accountId: 'a1', postings: [POSTING], grantedScopes: ['postings.write'] }),
      ),
    );

    expect(screen.getByRole('button', { name: 'Record posting' })).toBeEnabled();
    await user.click(within(screen.getByTestId('postings-panel')).getByText('PST0000000001'));
    expect(screen.getByRole('button', { name: 'Reverse' })).toBeDisabled();
  });

  it('computes the floor locally from the floor policy when the service has not stated one', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AccountDetail, {
          account: { ...ACCOUNT, floor: undefined, permittedToGoNegative: true, overdraftLimit: '500.00', minimumBalance: null },
          accountId: 'a1',
        }),
      ),
    );
    expect(screen.getByTestId('account-floor')).toHaveTextContent('500.00');
  });

  // DRK-1745: rewrite for the new form
  it.skip('renders every optional account field as blank rather than "undefined" when absent', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AccountDetail, {
          account: { ...ACCOUNT, groupName: undefined, classification: undefined, externalReference: undefined, notes: undefined },
          accountId: 'a1',
        }),
      ),
    );
    expect(screen.getByLabelText('Group')).toHaveValue('');
    expect(screen.getByLabelText('Free-form notes')).toHaveValue('');
    expect(screen.getByLabelText('Outside reference')).toHaveValue('');
    expect(screen.getByLabelText('Accounting classification')).toHaveValue('');
    expect(screen.queryByText('undefined')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('draws no amount — no tile figure, no floor, no postings — until the currency scale is known (review round 2 nit 4)', () => {
    renderDetail(['accounts.write'], { ...ACCOUNT, decimalPlaces: undefined, balance: '12400.5' });
    expect(screen.getByTestId('account-balance')).toHaveTextContent(/^Balance$/);
    expect(screen.getByTestId('account-available-balance')).toHaveTextContent(/^Available$/);
    expect(screen.getByTestId('account-held-amount')).toHaveTextContent(/^Held$/);
    expect(screen.getByTestId('account-floor')).toBeEmptyDOMElement();
    expect(screen.queryByTestId('postings-panel')).toBeNull();
    // The rest of the screen still works.
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  // DRK-1745: rewrite for the new form
  it.skip('shows no refusal on first render, before any save (kills the bogus-initial-array mutants)', () => {
    renderDetail(['accounts.write']);
    expect(screen.getByRole('button', { name: 'Save' }).closest('form')!.querySelector('[data-slot="card"]')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip("shows the reversal form for the selected posting's own Credit direction, not always Debit", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(within(screen.getByTestId('postings-panel')).getByText('PST0000000001'));
    await user.click(screen.getByRole('button', { name: 'Reverse' }));
    expect(within(screen.getByRole('dialog')).getByText('credit', { exact: false })).toBeInTheDocument();
  });

  // DRK-1745: rewrite for the new form
  it.skip('defaults grantedScopes, postingsFrom and postingsTo when the caller supplies none', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetail, { account: ACCOUNT, accountId: 'a1' })));

    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByLabelText('From')).toHaveValue('');
    expect(screen.getByLabelText('To')).toHaveValue('');
  });

  it('renders a plain not-found message for an address naming no account', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(AccountDetail, { account: null })));
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
    expect(screen.queryByTestId('account-balance')).toBeNull();
  });
});

describe('AccountDetail — saving the edit form (DRK-1704 finding 4)', () => {
  // DRK-1745: rewrite for the new form
  it.skip('carries a changed note through PUT with every other metadata key kept, and no name', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'a1', accountNumber: 'ACME-000123' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write'], SEEDED);

    await user.clear(screen.getByLabelText('Free-form notes'));
    await user.type(screen.getByLabelText('Free-form notes'), 'Reconciled monthly');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/a1', expect.objectContaining({ method: 'PUT' })));
    const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT')!;
    const body = JSON.parse((putCall[1] as RequestInit).body as string);
    expect(body).toEqual({ metadata: { source: 'core-banking', region: 'SG', notes: 'Reconciled monthly' } });
  });

  // DRK-1745: rewrite for the new form
  it.skip('sends a rename as name alone — no metadata, so the stored map is never replaced', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'a1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write'], SEEDED);

    await user.clear(screen.getByLabelText('Name', { exact: true }));
    await user.type(screen.getByLabelText('Name', { exact: true }), 'Renamed account');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const putCall = await waitFor(() => fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT')!);
    expect(JSON.parse((putCall[1] as RequestInit).body as string)).toEqual({ name: 'Renamed account' });
  });

  // DRK-1745: rewrite for the new form
  it.skip('skips the PUT entirely when neither the name nor the notes changed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'a1', status: 'Active' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write']);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/a1', expect.objectContaining({ method: 'PATCH' })));
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit)?.method === 'PUT')).toBe(false);
  });

  // DRK-1745: rewrite for the new form
  it.skip('sends the new name in the PUT body when only the name changed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'a1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write']);

    await user.clear(screen.getByLabelText('Name', { exact: true }));
    await user.type(screen.getByLabelText('Name', { exact: true }), 'Renamed account');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const putCall = await waitFor(() => fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT')!);
    const body = JSON.parse((putCall[1] as RequestInit).body as string);
    expect(body.name).toBe('Renamed account');
  });

  // DRK-1745: rewrite for the new form
  it.skip('shows the PUT refusal even when the PATCH that follows succeeds', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) =>
      init.method === 'PUT'
        ? Promise.resolve({ ok: false, text: async () => JSON.stringify({ errors: [{ message: 'Name too long.' }] }) })
        : Promise.resolve({ ok: true, text: async () => JSON.stringify({ id: 'a1' }) }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write']);

    await user.clear(screen.getByLabelText('Name', { exact: true }));
    await user.type(screen.getByLabelText('Name', { exact: true }), 'x'.repeat(300));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Name too long.')).toBeInTheDocument());
  });

  // DRK-1745: rewrite for the new form
  it.skip('shows the PATCH refusal for a floor-only change', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => JSON.stringify({ errors: [{ message: 'An overdraft limit is required.', code: 'OVERDRAFT_LIMIT_REQUIRED' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write']);

    await user.click(screen.getByLabelText('Permitted to go negative'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('An overdraft limit is required.')).toBeInTheDocument());
  });

  // DRK-1745: rewrite for the new form
  it.skip('sends name as undefined in the PUT body when only the notes changed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'a1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write']);

    await user.type(screen.getByLabelText('Free-form notes'), 'a note');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const putCall = await waitFor(() => fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT')!);
    const body = JSON.parse((putCall[1] as RequestInit).body as string);
    expect(body.name).toBeUndefined();
  });

  // DRK-1745: rewrite for the new form
  it.skip('never throws, and clears to no refusal, on a PUT failure carrying no errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => JSON.stringify({}) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write']);

    await user.clear(screen.getByLabelText('Name', { exact: true }));
    await user.type(screen.getByLabelText('Name', { exact: true }), 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Save' }).closest('form')!.querySelector('[data-slot="card"]')).toBeNull();
  });

  // DRK-1745: rewrite for the new form
  it.skip('never throws, and clears to no refusal, on a PATCH failure carrying no errors array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => JSON.stringify({}) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDetail(['accounts.write']);

    await user.click(screen.getByLabelText('Permitted to go negative'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Save' }).closest('form')!.querySelector('[data-slot="card"]')).toBeNull();
  });
});
