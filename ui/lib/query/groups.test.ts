import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAccountGroup, fetchAccountGroupBalances, fetchAccountGroups } from './groups';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAccountGroups', () => {
  it('builds filter, orderBy, desc and pageNumber from the list view state', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [], pageIndex: 0, pageSize: 10, pageCount: 1, hasNextPage: false }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAccountGroups({ filters: { status: 'Closed', ownerId: 'partner-bank-01' }, sort: { field: 'name', desc: false }, page: 2 });

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/api/ledger/account-groups');
    expect(url.searchParams.getAll('filter').sort()).toEqual(['OwnerId:Equal:partner-bank-01', 'Status:Equal:Closed'].sort());
    expect(url.searchParams.get('orderBy')).toBe('Name');
    expect(url.searchParams.get('desc')).toBe('false');
    expect(url.searchParams.get('pageNumber')).toBe('2');
  });

  it('defaults to page 1, carries no filter and no pageSize when the state has none', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [], pageIndex: 0, pageSize: 10, pageCount: 1, hasNextPage: false }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAccountGroups({ filters: {} });

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.getAll('filter')).toEqual([]);
    expect(url.searchParams.get('pageNumber')).toBe('1');
    expect(url.searchParams.has('pageSize')).toBe(false);
  });

  it('excludes a filter field whose value has been cleared to empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [], pageIndex: 0, pageSize: 10, pageCount: 1, hasNextPage: false }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAccountGroups({ filters: { status: 'Closed', ownerId: '' } });

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.getAll('filter')).toEqual(['Status:Equal:Closed']);
  });

  it('sends an explicit pageSize only once the operator has engaged pagination', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [], pageIndex: 1, pageSize: 10, pageCount: 2, hasNextPage: false }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAccountGroups({ filters: {}, page: 2, pageSize: 10 });

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('pageNumber')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('10');
  });

  it('parses the paged envelope through the exact-digit reader', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, { items: [{ id: 'g1', code: 'TRSY', name: 'Treasury', type: 'Customer', status: 'Active', ownerId: 'o1' }], pageIndex: 0, pageSize: 10, pageCount: 1, hasNextPage: false }),
      ),
    );

    const page = await fetchAccountGroups({ filters: {} });
    expect(page.items).toEqual([{ id: 'g1', code: 'TRSY', name: 'Treasury', type: 'Customer', status: 'Active', ownerId: 'o1' }]);
  });

  it('throws the service refusal message on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { errors: [{ message: 'Unknown filter field.' }] })));
    await expect(fetchAccountGroups({ filters: {} })).rejects.toThrow('Unknown filter field.');
  });

  it('falls back to a default message when a non-ok response carries a null body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    await expect(fetchAccountGroups({ filters: {} })).rejects.toThrow('Request failed.');
  });

  it('falls back to a default message when the errors array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { errors: [] })));
    await expect(fetchAccountGroups({ filters: {} })).rejects.toThrow('Request failed.');
  });
});

describe('fetchAccountGroup', () => {
  it('reads one group by id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: 'g1', code: 'TRSY', name: 'Treasury', type: 'Customer', status: 'Active', ownerId: 'o1' }));
    vi.stubGlobal('fetch', fetchMock);

    const group = await fetchAccountGroup('g1');
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/account-groups/g1');
    expect(group.code).toBe('TRSY');
  });

  it('throws on a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { errors: [{ message: 'Account group not found.' }] })));
    await expect(fetchAccountGroup('missing')).rejects.toThrow('Account group not found.');
  });
});

describe('fetchAccountGroupBalances', () => {
  it('keeps a balance past 2^53 as its exact text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[{"currency":"SGD","balance":9007199254740993.01,"available":9007199254740993.01,"held":0}]', { status: 200 })));

    const balances = await fetchAccountGroupBalances('g1');
    expect(balances).toEqual([{ currency: 'SGD', balance: '9007199254740993.01', available: '9007199254740993.01', held: '0' }]);
  });

  it('throws the service refusal message on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { errors: [{ message: 'Account group not found.' }] })));
    await expect(fetchAccountGroupBalances('missing')).rejects.toThrow('Account group not found.');
  });
});
