import { afterEach, describe, expect, it, vi } from 'vitest';
import { LedgerRefusalError } from '@/lib/api/refusal';
import {
  accountNumberExists,
  fetchPostingCount,
  fetchStatusCounts,
  lookupRecord,
  openedMonths,
  postingWeeks,
  searchAccountsAndGroups,
} from './overview';

function textResponse(text: string, status = 200): Response {
  return new Response(text, { status });
}

function stubFetch(...responses: Response[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function calledUrl(fetchMock: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(fetchMock.mock.calls[call][0] as string, 'http://console');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('postingWeeks', () => {
  it('gives 13 weeks of 7 days, oldest first, the latest ending today (UTC)', () => {
    const weeks = postingWeeks(new Date('2026-09-24T10:00:00Z'));

    expect(weeks).toHaveLength(13);
    expect(weeks[0]).toEqual({ from: '2026-06-26', to: '2026-07-02' });
    expect(weeks[11]).toEqual({ from: '2026-09-11', to: '2026-09-17' });
    expect(weeks[12]).toEqual({ from: '2026-09-18', to: '2026-09-24' });
  });

  it('takes today from UTC, not the computer clock: 23:30 UTC is still that UTC day', () => {
    expect(postingWeeks(new Date('2026-09-24T23:30:00Z'))[12]).toEqual({ from: '2026-09-18', to: '2026-09-24' });
    expect(postingWeeks(new Date('2026-09-25T00:30:00Z'))[12]).toEqual({ from: '2026-09-19', to: '2026-09-25' });
  });
});

describe('openedMonths', () => {
  it('gives the current month and the 11 before it, oldest first, each whole UTC month', () => {
    const months = openedMonths(new Date('2026-09-24T10:00:00Z'));

    expect(months.map((month) => month.label)).toEqual([
      'October 2025', 'November 2025', 'December 2025', 'January 2026', 'February 2026', 'March 2026',
      'April 2026', 'May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026',
    ]);
    expect(months[11]).toEqual({ label: 'September 2026', from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' });
    expect(months[10]).toEqual({ label: 'August 2026', from: '2026-08-01T00:00:00.000Z', to: '2026-08-31T23:59:59.999Z' });
    expect(months[4]).toEqual({ label: 'February 2026', from: '2026-02-01T00:00:00.000Z', to: '2026-02-28T23:59:59.999Z' });
  });

  it('takes the month from UTC: 1 September 00:30 in Singapore is still August in UTC', () => {
    expect(openedMonths(new Date('2026-08-31T16:30:00Z'))[11].label).toBe('August 2026');
  });
});

describe('fetchStatusCounts', () => {
  it('reads every status the service counts, with no narrowing sent', async () => {
    const fetchMock = stubFetch(textResponse('[{"type":"AccountStatus","status":"ACTIVE","count":1200},{"type":"AccountStatus","status":"DORMANT","count":0}]'));

    await expect(fetchStatusCounts('accounts')).resolves.toEqual([
      { status: 'ACTIVE', count: 1200 },
      { status: 'DORMANT', count: 0 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/status-counts');
  });

  it('sends only from and to when a window is given', async () => {
    const fetchMock = stubFetch(textResponse('[]'));

    await fetchStatusCounts('account-groups', { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' });

    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/ledger/account-groups/status-counts');
    expect([...url.searchParams.keys()]).toEqual(['from', 'to']);
    expect(url.searchParams.get('from')).toBe('2026-09-01T00:00:00.000Z');
    expect(url.searchParams.get('to')).toBe('2026-09-30T23:59:59.999Z');
  });

  it("throws the service's refusal", async () => {
    stubFetch(textResponse('{"errors":[{"code":"UnsupportedNarrowing","message":"Only from and to."}]}', 400));

    await expect(fetchStatusCounts('accounts')).rejects.toThrow('Only from and to.');
  });
});

describe('fetchPostingCount', () => {
  it("asks for a page of 1 in the window and takes the service's total", async () => {
    const fetchMock = stubFetch(textResponse('{"items":[{}],"pageNumber":1,"pageSize":1,"totalItemCount":1250}'));

    await expect(fetchPostingCount({ from: '2026-09-18', to: '2026-09-24' })).resolves.toBe(1250);
    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/ledger/postings');
    expect(url.searchParams.get('from')).toBe('2026-09-18');
    expect(url.searchParams.get('to')).toBe('2026-09-24');
    expect(url.searchParams.get('pageSize')).toBe('1');
  });
});

describe('lookupRecord', () => {
  it('returns the record the service found', async () => {
    stubFetch(textResponse('{"id":"a1","accountNumber":"ACME-000123","balance":10.50}'));

    await expect(lookupRecord('/api/ledger/accounts/a1')).resolves.toEqual({ state: 'found', record: { id: 'a1', accountNumber: 'ACME-000123', balance: '10.50' } });
  });

  it('says not found on a 404', async () => {
    stubFetch(textResponse('{"errors":[{"message":"Account not found."}]}', 404));

    await expect(lookupRecord('/api/ledger/accounts/a1')).resolves.toEqual({ state: 'notFound' });
  });

  it("says not permitted on a 403, keeping the service's wording", async () => {
    stubFetch(textResponse('{"errors":[{"code":"FORBIDDEN","message":"Not permitted."}]}', 403));

    const lookup = await lookupRecord('/api/ledger/postings/p1');
    expect(lookup.state).toBe('forbidden');
    expect(lookup.state === 'forbidden' && lookup.error).toBeInstanceOf(LedgerRefusalError);
    expect(lookup.state === 'forbidden' && lookup.error.message).toBe('Not permitted.');
  });

  it('throws any other refusal', async () => {
    stubFetch(textResponse('{"errors":[{"message":"The ledger service is unavailable."}]}', 502));

    await expect(lookupRecord('/api/ledger/accounts/a1')).rejects.toThrow('The ledger service is unavailable.');
  });
});

describe('searchAccountsAndGroups', () => {
  it("searches both with a page of 10 and keeps each service total", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/ledger/accounts?')
          ? textResponse('{"items":[{"id":"a1"}],"totalItemCount":37}')
          : textResponse('{"items":[{"id":"g1"},{"id":"g2"}],"totalItemCount":2}'),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchAccountsAndGroups('Acme & Co')).resolves.toEqual({
      accounts: { items: [{ id: 'a1' }], total: 37 },
      groups: { items: [{ id: 'g1' }, { id: 'g2' }], total: 2 },
    });
    const accounts = calledUrl(fetchMock, 0);
    const groups = calledUrl(fetchMock, 1);
    expect(accounts.pathname).toBe('/api/ledger/accounts');
    expect(groups.pathname).toBe('/api/ledger/account-groups');
    for (const url of [accounts, groups]) {
      expect(url.searchParams.get('search')).toBe('Acme & Co');
      expect(url.searchParams.get('pageSize')).toBe('10');
    }
  });
});

describe('accountNumberExists', () => {
  it('asks for the exact number and answers from the service total', async () => {
    const fetchMock = stubFetch(textResponse('{"items":[{}],"totalItemCount":1}'), textResponse('{"items":[],"totalItemCount":0}'));

    await expect(accountNumberExists('ACME-000123')).resolves.toBe(true);
    await expect(accountNumberExists('FEE-REFUND')).resolves.toBe(false);
    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/ledger/accounts');
    expect(url.searchParams.getAll('filter')).toEqual(['AccountNumber:Equal:ACME-000123']);
    expect(url.searchParams.get('pageSize')).toBe('1');
  });
});
