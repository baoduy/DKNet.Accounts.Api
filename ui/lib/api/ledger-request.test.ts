import { afterEach, describe, expect, it, vi } from 'vitest';
import { ledgerFetch, readLedger, sendLedgerWrite } from './ledger-request';
import { LedgerRefusalError } from './refusal';

function answer(status: number, text: string): Response {
  return new Response(text, { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ledgerFetch', () => {
  it('hands its arguments to fetch exactly as given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer(200, ''));
    vi.stubGlobal('fetch', fetchMock);

    await ledgerFetch('/api/ledger/currencies');
    await ledgerFetch('/api/ledger/currencies', { method: 'POST' });

    expect(fetchMock.mock.calls).toEqual([['/api/ledger/currencies'], ['/api/ledger/currencies', { method: 'POST' }]]);
  });
});

describe('readLedger', () => {
  it('answers the body with every number kept as its exact text (R1)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(200, '{"balance":12345678901234567.89}')));

    expect(await readLedger('/api/ledger/accounts/a1/balance')).toEqual({ balance: '12345678901234567.89' });
  });

  it("throws the service's refusal, with its code and trace", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(403, '{"errors":[{"code":"FORBIDDEN","message":"Not permitted."}],"traceId":"t-9"}')));

    const refused = await readLedger('/api/ledger/currencies').catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(LedgerRefusalError);
    expect(refused).toMatchObject({ message: 'Not permitted.', code: 'FORBIDDEN', traceId: 't-9' });
  });
});

describe('sendLedgerWrite', () => {
  it('answers the status and the parsed body of a write that went through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(201, '{"id":"g1","decimalPlaces":2}')));

    expect(await sendLedgerWrite('/api/ledger/account-groups', { method: 'POST' })).toEqual({ ok: true, status: 201, body: { id: 'g1', decimalPlaces: '2' } });
  });

  it('answers a null body for a 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    expect(await sendLedgerWrite('/api/ledger/account-groups/g1', { method: 'DELETE' })).toEqual({ ok: true, status: 204, body: null });
  });

  it("answers a refusal's errors and trace", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(409, '{"errors":[{"code":"DUPLICATE_GROUP_CODE","message":"Code taken."}],"traceId":"t-1"}')));

    expect(await sendLedgerWrite('/api/ledger/account-groups', { method: 'POST' })).toEqual({
      ok: false,
      errors: [{ code: 'DUPLICATE_GROUP_CODE', message: 'Code taken.' }],
      traceId: 't-1',
    });
  });

  it('answers a refusal with no body as a refusal with nothing to show, never a throw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(500, '')));

    expect(await sendLedgerWrite('/api/ledger/account-groups', { method: 'POST' })).toEqual({ ok: false, errors: undefined, traceId: undefined });
  });
});
