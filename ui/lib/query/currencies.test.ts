import { afterEach, describe, expect, it, vi } from 'vitest';
import { LedgerRefusalError } from '@/lib/api/refusal';
import { fetchCurrencies, fetchCurrency, fetchLedgerBalances } from './currencies';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchCurrencies', () => {
  it('reads the currency list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, [{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]));
    vi.stubGlobal('fetch', fetchMock);

    const currencies = await fetchCurrencies();
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/currencies');
    expect(currencies).toEqual([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]);
  });

  it("reads the currencies from the service's page (DRK-1732 §3 row 10)", async () => {
    const page = {
      items: [{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }],
      pageNumber: 1,
      pageSize: 1000,
      pageCount: 1,
      totalItemCount: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, page)));

    expect(await fetchCurrencies()).toEqual([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]);
  });

  it('throws the service refusal message on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, { errors: [{ message: 'Unexpected error.' }] })));
    await expect(fetchCurrencies()).rejects.toThrow('Unexpected error.');
  });

  it('falls back to a default message when a non-ok response carries a null body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    await expect(fetchCurrencies()).rejects.toThrow('Request failed.');
  });

  it('falls back to a default message when the errors array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, { errors: [] })));
    await expect(fetchCurrencies()).rejects.toThrow('Request failed.');
  });

  it('keeps the service code and traceId on the thrown error (DRK-1700 review I2)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { errors: [{ message: 'Session expired.', code: 'UNAUTHENTICATED' }], traceId: 't-2' })));
    try {
      await fetchCurrencies();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(LedgerRefusalError);
      expect((error as LedgerRefusalError).code).toBe('UNAUTHENTICATED');
      expect((error as LedgerRefusalError).traceId).toBe('t-2');
    }
  });
});

describe('fetchCurrency', () => {
  it('reads one currency by id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }));
    vi.stubGlobal('fetch', fetchMock);

    const currency = await fetchCurrency('c1');
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/currencies/c1');
    expect(currency.code).toBe('SGD');
  });

  it('throws on a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { errors: [{ message: 'Currency not found.' }] })));
    await expect(fetchCurrency('missing')).rejects.toThrow('Currency not found.');
  });
});

describe('fetchLedgerBalances', () => {
  it('reads the ledger-wide per-currency totals', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[{"currency":"USD","balance":400.00}]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const balances = await fetchLedgerBalances();
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/accounts/balances');
    expect(balances).toEqual([{ currency: 'USD', balance: '400.00' }]);
  });

  it('throws the service refusal message on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, { errors: [{ message: 'Balances unavailable.' }] })));
    await expect(fetchLedgerBalances()).rejects.toThrow('Balances unavailable.');
  });
});
