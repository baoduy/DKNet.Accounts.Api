/**
 * DRK-1760 §3 rows 6, 7, 8, 10 — the currencies screen on the shared hooks: its view (`?status=`,
 * `?q=`, `?sort=`, `?page=`, `?pageSize=`, `?open=`) lives in the page address, an unsent edit asks
 * before it is dropped, every write disables its action while in flight and ends on the shared
 * success card.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrenciesScreen } from './CurrenciesScreen';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

interface Row {
  id: string;
  code: string;
  name: string;
  decimalPlaces: number;
  isActive: boolean;
}

const CLOSED = ['AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'JPY', 'KRW'].map((code) => ({ id: `id-${code}`, code, name: code, decimalPlaces: 2, isActive: false }));
const SGD: Row = { id: 'id-SGD', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true };

type Answer = { status: number; ok: boolean; text: () => Promise<string> };

function answer(body: unknown, status = 200): Answer {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) };
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

function stubLedger({ rows = [SGD, ...CLOSED], balances = [], write }: { rows?: Row[]; balances?: unknown[]; write?: (url: string, init: RequestInit) => Promise<Answer> } = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method && init.method !== 'GET') return write ? write(url, init) : Promise.resolve(answer(rows[0]));
    if (url === '/api/ledger/currencies') return Promise.resolve(answer({ items: rows }));
    if (url === '/api/ledger/accounts/balances') return Promise.resolve(answer(balances));
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderScreen(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(CurrenciesScreen, { grantedScopes: ['accounts.read', 'accounts.write'] })));
}

function bodyCodes(): string[] {
  return Array.from(document.querySelectorAll('tbody tr td:first-child')).map((cell) => cell.textContent ?? '');
}

function lastPush(): string {
  return push.mock.calls.at(-1)?.[2] as string;
}

async function openFilter(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
  return within(screen.getByRole('group', { name: 'Filters' })).getByLabelText('Status');
}

describe('Currencies — the view lives in the address (rows 5, 6)', () => {
  it('opens on the view the address carries: Closed, by code, page 2, JPY open', async () => {
    mockSearch = 'status=Closed&sort=code&page=2&open=id-JPY';
    stubLedger();
    renderScreen();

    await waitFor(() => expect(bodyCodes()).toEqual(['JPY', 'KRW']));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Code' })).toHaveAttribute('aria-sort', 'ascending');
    expect(within(screen.getByTestId('detail-panel')).getByText('JPY · JPY')).toBeInTheDocument();
    expect(await openFilter()).toHaveValue('Closed');
  });

  it('adds one history entry per change: status, search, sort, page, page size and the open record', async () => {
    stubLedger();
    renderScreen();
    await waitFor(() => expect(bodyCodes()).toHaveLength(10));

    await userEvent.selectOptions(await openFilter(), 'Closed');
    expect(lastPush()).toBe('/currencies?status=Closed');
    await userEvent.keyboard('{Escape}');

    await userEvent.click(within(screen.getByRole('columnheader', { name: 'Code' })).getByRole('button'));
    expect(lastPush()).toBe('/currencies?status=Closed&sort=code');
    await userEvent.click(within(screen.getByRole('columnheader', { name: 'Code' })).getByRole('button'));
    expect(lastPush()).toBe('/currencies?status=Closed&sort=-code');

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(lastPush()).toBe('/currencies?status=Closed&sort=-code&page=2');

    await userEvent.click(screen.getByRole('row', { name: /\bAUD\b/ }));
    expect(lastPush()).toBe('/currencies?status=Closed&sort=-code&page=2&open=id-AUD');
    await userEvent.click(screen.getByRole('row', { name: /\bAUD\b/ }));
    expect(push).toHaveBeenCalledTimes(5);

    await userEvent.type(screen.getByPlaceholderText('Search code or name'), 'k');
    expect(lastPush()).toBe('/currencies?status=Closed&q=k&sort=-code&open=id-AUD');
    expect(push).toHaveBeenCalledTimes(6);
  });

  it('changes the page size from the first page, and clears the status filter', async () => {
    mockSearch = 'status=Closed&page=2';
    stubLedger();
    renderScreen();
    await waitFor(() => expect(bodyCodes()).toEqual(['JPY', 'KRW']));

    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '5');
    expect(lastPush()).toBe('/currencies?status=Closed&pageSize=5');

    await openFilter();
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(lastPush()).toBe('/currencies?pageSize=5');
  });

  it('draws the view the address holds once Back moves it', async () => {
    mockSearch = 'open=id-SGD';
    stubLedger();
    renderScreen();
    await within(screen.getByTestId('detail-panel')).findByText('SGD · Singapore Dollar');

    act(() => {
      window.history.replaceState(null, '', '/currencies?page=2');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.queryByTestId('detail-panel')).toBeNull();
    await waitFor(() => expect(screen.getByText('Page 2 of 2')).toBeInTheDocument());
    window.history.replaceState(null, '', '/');
  });
});

describe('Currencies — the balances read', () => {
  it.each(['', 'open=id-UNKNOWN'])('reads no balance while no known currency is viewed (%s)', async (search) => {
    mockSearch = search;
    const fetchMock = stubLedger();
    renderScreen();
    await waitFor(() => expect(bodyCodes()).toHaveLength(10));

    expect(fetchMock.mock.calls.some(([url]) => url === '/api/ledger/accounts/balances')).toBe(false);
  });
});

describe('Currencies — the panel (rows 7, 10)', () => {
  it('asks before an edited name is dropped, from the close control and from Cancel', async () => {
    mockSearch = 'open=id-SGD';
    stubLedger();
    renderScreen();
    const panel = await screen.findByTestId('detail-panel');
    await userEvent.click(await within(panel).findByRole('button', { name: 'Edit currency' }));
    await userEvent.type(within(panel).getByLabelText('Name'), '!');

    await userEvent.click(within(panel).getByRole('button', { name: 'Close details' }));
    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));

    await userEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByTestId('detail-panel')).toBeNull();
    expect(lastPush()).toBe('/currencies?');
  });

  it('offers Close currency only once the balances are read and none is held', async () => {
    mockSearch = 'open=id-SGD';
    stubLedger({ balances: [{ currency: 'SGD', balance: '5.00', available: '5.00', held: '0.00' }] });
    renderScreen();
    const panel = await screen.findByTestId('detail-panel');

    await within(panel).findByText('Accounts in this currency hold a balance, so it cannot be closed.');
    expect(within(panel).getByRole('button', { name: 'Close currency' })).toBeDisabled();
  });

  it('keeps the close dialog up with its confirm disabled until the service answers, then shows "Currency closed"', async () => {
    mockSearch = 'open=id-SGD';
    let answerClose!: (answer: Answer) => void;
    stubLedger({ write: () => new Promise((resolve) => (answerClose = resolve)) });
    renderScreen();
    const panel = await screen.findByTestId('detail-panel');
    const close = await within(panel).findByRole('button', { name: 'Close currency' });
    await waitFor(() => expect(close).toBeEnabled());

    await userEvent.click(close);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep currency open' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(close);
    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Close currency' });
    await userEvent.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    expect(screen.getByRole('dialog', { name: 'Close currency' })).toBeInTheDocument();

    answerClose(answer({ ...SGD, isActive: false }));
    expect(await screen.findByRole('status')).toHaveTextContent('Currency closedSGD is closed. Existing balances stay readable; no new account can be opened in it.');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the dialog on Escape', async () => {
    mockSearch = 'open=id-SGD';
    stubLedger();
    renderScreen();
    const close = await within(await screen.findByTestId('detail-panel')).findByRole('button', { name: 'Close currency' });
    await waitFor(() => expect(close).toBeEnabled());
    await userEvent.click(close);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows "Currency reopened" once a closed currency is reopened', async () => {
    mockSearch = 'open=id-JPY';
    stubLedger();
    renderScreen();
    await userEvent.click(await within(await screen.findByTestId('detail-panel')).findByRole('button', { name: 'Reopen currency' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Currency reopenedJPY is active again. Accounts can be opened in it.');
  });
});

describe('Currencies — registration and rename (rows 8, 10)', () => {
  it.each([
    { places: '0', text: 'Registered THB at 0 decimal places. Accounts can now be opened in it.' },
    { places: '1', text: 'Registered THB at 1 decimal place. Accounts can now be opened in it.' },
  ])('disables Register while in flight, then opens the new currency and shows "Currency registered" ($places places)', async ({ places, text }) => {
    const created = { id: 'id-THB', code: 'THB', name: 'Thai Baht', decimalPlaces: Number(places), isActive: true };
    let answerRegister!: (answer: Answer) => void;
    stubLedger({ rows: [SGD, created], write: () => new Promise((resolve) => (answerRegister = resolve)) });
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New currency' }));
    const panel = screen.getByTestId('detail-panel');
    await userEvent.type(within(panel).getByLabelText('Code'), 'thb');
    await userEvent.type(within(panel).getByLabelText('Name'), 'Thai Baht');
    await userEvent.type(within(panel).getByLabelText('Decimal places'), places);

    const register = within(panel).getByRole('button', { name: 'Register currency' });
    await userEvent.click(register);
    await waitFor(() => expect(register).toBeDisabled());

    answerRegister(answer(created, 201));
    expect(await screen.findByRole('status')).toHaveTextContent(`Currency registered${text}`);
    expect(lastPush()).toBe('/currencies?open=id-THB');
    expect(await within(screen.getByTestId('detail-panel')).findByText('THB · Thai Baht')).toBeInTheDocument();
  });

  it('shows "Changes saved" once a rename went through', async () => {
    mockSearch = 'open=id-SGD';
    stubLedger();
    renderScreen();
    const panel = await screen.findByTestId('detail-panel');
    await userEvent.click(await within(panel).findByRole('button', { name: 'Edit currency' }));
    await userEvent.type(within(panel).getByLabelText('Name'), ' (SGD)');

    await userEvent.click(within(panel).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Changes savedUpdated SGD — name. Stored balances are unaffected.');
  });
});
