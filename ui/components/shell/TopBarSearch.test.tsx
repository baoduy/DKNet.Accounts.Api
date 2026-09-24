import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarSearch, SEARCH_LABEL } from './TopBarSearch';

const ID = '6d1e4f0a-2b3c-4d5e-8f90-a1b2c3d4e5f6';
const ALL_READS = ['accounts.read', 'postings.read'];

type Answer = { status: number; body: unknown };

function respond({ status, body }: Answer): Response {
  return new Response(JSON.stringify(body), { status });
}

const NOT_FOUND: Answer = { status: 404, body: { errors: [{ message: 'Not found.' }] } };

/** Answers each path from `answers` (by its start), and 404 for anything else. */
function stubLedger(answers: Record<string, Answer | (() => Promise<Response>)>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const match = Object.keys(answers).find((prefix) => url.startsWith(prefix));
    if (!match) return Promise.resolve(respond(NOT_FOUND));
    const answer = answers[match];
    return typeof answer === 'function' ? answer() : Promise.resolve(respond(answer));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function paths(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map(([url]) => url as string);
}

async function search(typed: string, grantedScopes: string[] = ALL_READS): Promise<void> {
  render(<TopBarSearch grantedScopes={grantedScopes} />);
  const user = userEvent.setup();
  await user.type(screen.getByRole('searchbox', { name: SEARCH_LABEL }), `${typed}{Enter}`);
}

function results(): HTMLElement {
  return screen.getByRole('region', { name: 'Search results' });
}

/** Where the search sends the browser — jsdom cannot navigate, so `location.assign` is watched. */
let go: ReturnType<typeof vi.fn>;
const realLocation = window.location;

beforeEach(() => {
  go = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, assign: go } });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('an identifier', () => {
  it('opens the account it names, by its number', async () => {
    stubLedger({ [`/api/ledger/accounts/${ID}`]: { status: 200, body: { id: ID, accountNumber: 'ACME-000123' } } });

    await search(ID);

    await waitFor(() => expect(go).toHaveBeenCalledWith('/accounts/ACME-000123'));
  });

  it('opens the group it names when no account carries it', async () => {
    const fetchMock = stubLedger({ [`/api/ledger/account-groups/${ID}`]: { status: 200, body: { id: ID, code: 'ACME' } } });

    await search(ID);

    await waitFor(() => expect(go).toHaveBeenCalledWith(`/groups?open=${ID}`));
    expect(paths(fetchMock)).toEqual([`/api/ledger/accounts/${ID}`, `/api/ledger/account-groups/${ID}`]);
  });

  it('opens the posting it names when no account or group carries it', async () => {
    stubLedger({ [`/api/ledger/postings/${ID}`]: { status: 200, body: { id: ID, postingNumber: 'P-10042' } } });

    await search(ID);

    await waitFor(() => expect(go).toHaveBeenCalledWith(`/records?open=${ID}`));
  });

  it('says nothing carries it after all 3 lookups', async () => {
    const fetchMock = stubLedger({});

    await search(ID);

    expect(await within(results()).findByText('No account, group or posting carries this identifier.')).toBeInTheDocument();
    expect(paths(fetchMock)).toEqual([`/api/ledger/accounts/${ID}`, `/api/ledger/account-groups/${ID}`, `/api/ledger/postings/${ID}`]);
    expect(go).not.toHaveBeenCalled();
  });

  it('skips postings without postings.read and says which permission that needs', async () => {
    const fetchMock = stubLedger({});

    await search(ID, ['accounts.read']);

    expect(await within(results()).findByText('Postings were not looked up.')).toBeInTheDocument();
    expect(within(results()).getByText('No account or group carries this identifier.')).toBeInTheDocument();
    expect(within(results()).getByText('requires postings.read')).toBeInTheDocument();
    expect(paths(fetchMock)).not.toContain(`/api/ledger/postings/${ID}`);
  });

  it.each([
    ['account', `/api/ledger/accounts/${ID}`],
    ['group', `/api/ledger/account-groups/${ID}`],
    ['posting', `/api/ledger/postings/${ID}`],
  ])("states the service's refusal when the %s lookup is not permitted", async (_, path) => {
    stubLedger({ [path]: { status: 403, body: { errors: [{ code: 'FORBIDDEN', message: 'Not permitted.' }] } } });

    await search(ID);

    expect(await within(results()).findByText('FORBIDDEN')).toBeInTheDocument();
    expect(within(results()).getByText(/Not permitted\./)).toBeInTheDocument();
    expect(go).not.toHaveBeenCalled();
  });
});

describe('an account number', () => {
  it('narrows the accounts list to that number, upper-cased', async () => {
    const fetchMock = stubLedger({ '/api/ledger/accounts?': { status: 200, body: { items: [{}], totalItemCount: 1 } } });

    await search('acme-000123');

    await waitFor(() => expect(go).toHaveBeenCalledWith('/accounts?accountNumber=ACME-000123'));
    expect(new URLSearchParams(paths(fetchMock)[0].split('?')[1]).getAll('filter')).toEqual(['AccountNumber:Equal:ACME-000123']);
  });

  it('says no account carries it and offers a text search for what was typed', async () => {
    const fetchMock = stubLedger({
      '/api/ledger/accounts?filter': { status: 200, body: { items: [], totalItemCount: 0 } },
      '/api/ledger/accounts?search': { status: 200, body: { items: [], totalItemCount: 0 } },
      '/api/ledger/account-groups?search': { status: 200, body: { items: [{ id: 'g1', code: 'FEEREF', name: 'Fee-refund desk' }], totalItemCount: 1 } },
    });

    await search('  fee-refund ');

    expect(await within(results()).findByText('No account carries the number FEE-REFUND.')).toBeInTheDocument();
    fireEvent.click(within(results()).getByRole('button', { name: 'Search accounts and groups for "fee-refund"' }));
    const groups = await within(results()).findByRole('region', { name: 'Matching groups' });
    expect(within(groups).getAllByRole('listitem')).toHaveLength(1);
    expect(within(groups).getByText('1 group matched')).toBeInTheDocument();
    expect(paths(fetchMock)).toContain('/api/ledger/account-groups?search=fee-refund&pageSize=10');
  });
});

describe('free text', () => {
  it("lists accounts and groups, states each service total and links each full list", async () => {
    stubLedger({
      '/api/ledger/accounts?': {
        status: 200,
        body: { items: [{ id: 'a1', accountNumber: 'ACME-000001', name: 'Acme One' }], totalItemCount: 37 },
      },
      '/api/ledger/account-groups?': { status: 200, body: { items: [], totalItemCount: 0 } },
    });

    await search('Acme One');

    const accounts = await within(results()).findByRole('region', { name: 'Matching accounts' });
    const groups = within(results()).getByRole('region', { name: 'Matching groups' });
    expect(within(accounts).getByText('37 accounts matched')).toBeInTheDocument();
    expect(within(accounts).getByRole('listitem')).toHaveTextContent('ACME-000001Acme One');
    expect(within(accounts).getByRole('link', { name: 'ACME-000001' })).toHaveAttribute('href', '/accounts/ACME-000001');
    expect(within(accounts).getByRole('link', { name: 'Show all on the Accounts screen' })).toHaveAttribute('href', '/accounts?search=Acme+One');
    expect(within(groups).getByText('0 groups matched')).toBeInTheDocument();
    expect(within(groups).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(groups).getByRole('link', { name: 'Show all on the Account groups screen' })).toHaveAttribute('href', '/groups?search=Acme+One');
  });

  it('writes a count past 999 with a thousands separator', async () => {
    stubLedger({
      '/api/ledger/accounts?': { status: 200, body: { items: [], totalItemCount: 1200 } },
      '/api/ledger/account-groups?': { status: 200, body: { items: [{ id: 'g1', code: 'ACME', name: 'Acme' }], totalItemCount: 1 } },
    });

    await search('Acme');

    expect(await within(results()).findByText('1,200 accounts matched')).toBeInTheDocument();
    expect(within(results()).getByRole('link', { name: 'ACME' })).toHaveAttribute('href', '/groups?open=g1');
  });

  it("states the service's refusal in the results", async () => {
    stubLedger({ '/api/ledger/accounts?': { status: 400, body: { errors: [{ message: 'Search term must be at least 2 characters.' }] } } });

    await search('Acme');

    expect(await within(results()).findByText(/Search term must be at least 2 characters\./)).toBeInTheDocument();
  });

  it('says it is searching until the service answers', async () => {
    let answer: (response: Response) => void = () => {};
    stubLedger({ '/api/ledger/': () => new Promise<Response>((resolve) => (answer = resolve)) });

    await search('Acme');

    expect(within(results()).getByText('Searching…')).toBeInTheDocument();
    answer(respond({ status: 200, body: { items: [], totalItemCount: 0 } }));
  });

  it('draws only the latest search when an earlier answer arrives last', async () => {
    const answers: Array<(response: Response) => void> = [];
    stubLedger({ '/api/ledger/': () => new Promise<Response>((resolve) => answers.push(resolve)) });
    render(<TopBarSearch grantedScopes={ALL_READS} />);
    const field = screen.getByRole('searchbox', { name: SEARCH_LABEL });
    const user = userEvent.setup();
    await user.type(field, 'Old{Enter}');
    await user.clear(field);
    await user.type(field, 'New{Enter}');

    // The second search's two reads answer first, then the first search's.
    answers[2](respond({ status: 200, body: { items: [], totalItemCount: 2 } }));
    answers[3](respond({ status: 200, body: { items: [], totalItemCount: 2 } }));
    expect(await within(results()).findByText('2 accounts matched')).toBeInTheDocument();
    answers[0](respond({ status: 200, body: { items: [], totalItemCount: 9 } }));
    answers[1](respond({ status: 200, body: { items: [], totalItemCount: 9 } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(within(results()).queryByText('9 accounts matched')).toBeNull();
  });
});

describe('putting the results away (DRK-1734 N2)', () => {
  const ANSWERED = {
    '/api/ledger/accounts?': { status: 200, body: { items: [], totalItemCount: 3 } },
    '/api/ledger/account-groups?': { status: 200, body: { items: [], totalItemCount: 0 } },
  };

  it('removes the results on Escape and keeps focus in the field', async () => {
    stubLedger(ANSWERED);
    await search('Acme');
    expect(await within(results()).findByText('3 accounts matched')).toBeInTheDocument();

    await userEvent.setup().keyboard('{Escape}');

    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).toHaveFocus();
  });

  it('removes the results when the field is emptied, and keeps focus in the field', async () => {
    stubLedger(ANSWERED);
    await search('Acme');
    expect(await within(results()).findByText('3 accounts matched')).toBeInTheDocument();

    await userEvent.setup().clear(screen.getByRole('searchbox', { name: SEARCH_LABEL }));

    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).toHaveFocus();
  });

  it('keeps the results while the field still holds text', async () => {
    stubLedger(ANSWERED);
    await search('Acme');
    expect(await within(results()).findByText('3 accounts matched')).toBeInTheDocument();

    await userEvent.setup().keyboard('{Backspace}');

    expect(within(results()).getByText('3 accounts matched')).toBeInTheDocument();
  });

  it('never draws an answer that arrives after Escape', async () => {
    const answers: Array<(response: Response) => void> = [];
    stubLedger({ '/api/ledger/': () => new Promise<Response>((resolve) => answers.push(resolve)) });
    await search('Acme');
    const user = userEvent.setup();
    await user.keyboard('{Escape}');

    answers[0](respond({ status: 200, body: { items: [], totalItemCount: 3 } }));
    answers[1](respond({ status: 200, body: { items: [], totalItemCount: 0 } }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
  });
});

describe('the field', () => {
  it('states no route and sends nothing while empty', async () => {
    const fetchMock = stubLedger({});
    render(<TopBarSearch grantedScopes={ALL_READS} />);

    fireEvent.keyDown(screen.getByRole('searchbox', { name: SEARCH_LABEL }), { key: 'Enter' });

    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).toHaveAccessibleDescription('');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
  });

  it('states no route for spaces alone', async () => {
    stubLedger({});
    render(<TopBarSearch grantedScopes={ALL_READS} />);

    await userEvent.setup().type(screen.getByRole('searchbox', { name: SEARCH_LABEL }), '   ');

    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).toHaveAccessibleDescription('');
  });

  it("hints what to type: the whole range on Overview, the shortcut in the top bar", () => {
    const { unmount } = render(<TopBarSearch grantedScopes={ALL_READS} />);
    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).toHaveAttribute('placeholder', 'Search (⌘K)');
    unmount();

    render(<TopBarSearch grantedScopes={ALL_READS} variant="page" />);
    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).toHaveAttribute('placeholder', 'Account id or number, group, posting id, or a name');
  });

  it('describes the field with the route it will take', async () => {
    stubLedger({});
    render(<TopBarSearch grantedScopes={ALL_READS} />);

    await userEvent.setup().type(screen.getByRole('searchbox', { name: SEARCH_LABEL }), 'Acme');

    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).toHaveAccessibleDescription('Searched across accounts and groups.');
  });

  it('sends nothing on a key other than Enter', async () => {
    const fetchMock = stubLedger({});
    render(<TopBarSearch grantedScopes={ALL_READS} />);

    await userEvent.setup().type(screen.getByRole('searchbox', { name: SEARCH_LABEL }), 'Acme{Tab}');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is one search landmark', () => {
    render(<TopBarSearch grantedScopes={ALL_READS} />);

    expect(screen.getAllByRole('search')).toHaveLength(1);
  });

  it('takes focus on Ctrl+K and on ⌘K, and stops listening once gone', () => {
    const { unmount } = render(
      <>
        <button type="button">elsewhere</button>
        <TopBarSearch grantedScopes={ALL_READS} />
      </>,
    );
    const field = screen.getByRole('searchbox', { name: SEARCH_LABEL });
    const elsewhere = screen.getByRole('button', { name: 'elsewhere' });

    elsewhere.focus();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(field).toHaveFocus();

    elsewhere.focus();
    fireEvent.keyDown(window, { key: 'K', metaKey: true });
    expect(field).toHaveFocus();

    elsewhere.focus();
    fireEvent.keyDown(window, { key: 'k' });
    fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    expect(elsewhere).toHaveFocus();

    const removed = vi.spyOn(window, 'removeEventListener');
    unmount();
    expect(removed).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('keeps the browser from acting on the shortcut itself', () => {
    render(<TopBarSearch grantedScopes={ALL_READS} />);

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("is focused when it opens as Overview's own field, and not in the top bar", () => {
    const { unmount } = render(<TopBarSearch grantedScopes={ALL_READS} />);
    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).not.toHaveFocus();
    unmount();

    render(<TopBarSearch grantedScopes={ALL_READS} variant="page" />);
    expect(screen.getByRole('searchbox', { name: SEARCH_LABEL })).toHaveFocus();
  });
});
