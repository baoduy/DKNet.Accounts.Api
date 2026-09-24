/**
 * DRK-1728 §3 rows 8-9 — `?open=<id>` opens a group's panel on arrival, `?search=` is sent as the
 * service's free-text search, and opening a group's panel puts it in recently viewed.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readRecent } from '@/lib/recent/store';
import { AccountGroupsScreen } from './AccountGroupsScreen';

const MAI = '11111111-1111-4111-8111-111111111111';
const GROUP = { id: 'c0000000-0000-4000-8000-000000000001', code: 'INITECH', name: 'Initech', type: 'Customer', status: 'Active', ownerId: 'ops' };

let mockSearch = '';
vi.mock('next/navigation', () => ({
  usePathname: () => '/groups',
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

function answer(url: string): Promise<Response> {
  const body = url.startsWith('/api/ledger/account-groups?')
    ? { items: [GROUP], pageNumber: 1, pageSize: 1000, pageCount: 1, totalItemCount: 1, hasNextPage: false }
    : url.endsWith('/balances')
      ? []
      : GROUP;
  return Promise.resolve(new Response(JSON.stringify(body)));
}

function renderScreen(directoryObjectId?: string): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation(answer);
  vi.stubGlobal('fetch', fetchMock);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AccountGroupsScreen grantedScopes={['accounts.read']} directoryObjectId={directoryObjectId} />
    </QueryClientProvider>,
  );
  return fetchMock;
}

let replaceState: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) });
  replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  replaceState.mockRestore();
  mockSearch = '';
});

describe('AccountGroupsScreen — ?open= and recently viewed', () => {
  it('opens the group named by ?open= on arrival and keeps it in recently viewed', async () => {
    mockSearch = `open=${GROUP.id}`;
    renderScreen(MAI);

    const panel = screen.getByTestId('detail-panel');
    await waitFor(() => expect(within(panel).getByText('Initech')).toBeInTheDocument());
    expect(readRecent(MAI).map((entry) => [entry.kind, entry.id])).toEqual([['AccountGroup', GROUP.id]]);
  });

  it('keeps a group chosen from the list in recently viewed as its panel opens', async () => {
    renderScreen(MAI);
    expect(screen.queryByTestId('detail-panel')).toBeNull();
    expect(readRecent(MAI)).toEqual([]);

    await userEvent.setup().click(await screen.findByRole('cell', { name: 'INITECH' }));

    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
    expect(readRecent(MAI).map((entry) => entry.id)).toEqual([GROUP.id]);
  });

  it('drops ?open= from the address when the panel is closed', async () => {
    mockSearch = `open=${GROUP.id}`;
    renderScreen(MAI);
    await waitFor(() => expect(within(screen.getByTestId('detail-panel')).getByText('Initech')).toBeInTheDocument());

    await userEvent.setup().click(within(screen.getByTestId('detail-panel')).getByRole('button', { name: 'Close' }));

    expect(screen.queryByTestId('detail-panel')).toBeNull();
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/groups?');
  });

  it('leaves the address alone when closing a panel the list opened', async () => {
    renderScreen(MAI);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('cell', { name: 'INITECH' }));
    replaceState.mockClear();

    await user.click(within(screen.getByTestId('detail-panel')).getByRole('button', { name: 'Close' }));

    expect(screen.queryByTestId('detail-panel')).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('keeps nothing when no operator is named', async () => {
    mockSearch = `open=${GROUP.id}`;
    renderScreen();

    await waitFor(() => expect(within(screen.getByTestId('detail-panel')).getByText('Initech')).toBeInTheDocument());
    expect(localStorage.getItem('recently-viewed:undefined')).toBeNull();
  });

  it("sends ?search= to the service as its free-text search", async () => {
    mockSearch = 'search=Acme';
    const fetchMock = renderScreen(MAI);

    await screen.findByRole('cell', { name: 'INITECH' });
    const listUrl = new URL(fetchMock.mock.calls.map(([url]) => url as string).find((url) => url.startsWith('/api/ledger/account-groups?'))!, 'http://console');
    expect(listUrl.searchParams.get('search')).toBe('Acme');
    expect(listUrl.searchParams.getAll('filter')).toEqual([]);
  });
});
