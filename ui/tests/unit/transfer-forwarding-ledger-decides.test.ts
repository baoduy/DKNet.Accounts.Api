// @vitest-environment node
/**
 * DRK-2325 §5:
 *   @unit Scenario: The ledger still decides who may record a transfer
 *     Given Mai holds accounts.read and postings.read only
 *     When a request to record a transfer reaches the console's forwarding route
 *     Then the console forwards it with Mai's access token
 *     And it passes back the ledger's forbidden answer unchanged
 *
 * Drives the forwarding route's own `POST` handler with Mai's session stubbed and the ledger
 * service (`fetch`) answering 403 for her missing postings.write.
 *
 * RED today: `POST /transfers` is not on the console's list (`contract/openapi.json`), so the
 * route answers its own 404 and never calls the ledger (brief §3 row 1).
 */
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/ledger/[...route]/route';

const MAI_ACCESS_TOKEN = 'MAI-ACCESS-TOKEN-READ-ONLY';
const FORBIDDEN_BODY = '{"status":403,"errors":[{"message":"The caller lacks the postings.write scope."}],"traceId":"trace-403"}';

vi.mock('@/lib/config', () => ({ loadConfig: () => ({ sessionSecret: 'secret', apiBaseUrl: 'http://ledger.test' }) }));
vi.mock('@/lib/crypto', () => ({ verifyCookieValue: () => 'session-1' }));
vi.mock('@/lib/session', () => ({ SESSION_COOKIE_NAME: 'sessionId', getSession: async () => ({ sessionId: 'session-1' }) }));
vi.mock('@/lib/token-store', () => ({ getAccessToken: async () => ({ accessToken: MAI_ACCESS_TOKEN }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('The ledger still decides who may record a transfer', () => {
  it("forwards the record with Mai's access token and passes back the ledger's 403 unchanged", async () => {
    const ledger = vi.fn(async () => new Response(FORBIDDEN_BODY, { status: 403, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', ledger);
    const request = new NextRequest('http://console.test/api/ledger/transfers', {
      method: 'POST',
      headers: { cookie: 'sessionId=signed-session-cookie', 'idempotency-key': 'k-1', 'content-type': 'application/json' },
      body: '{"sourceAccountId":"a0000000-0000-4000-8000-000000000101","destinationAccountId":"a0000000-0000-4000-8000-000000000201","amount":"100.00","sourceCurrency":"SGD","destinationCurrency":"USD","exchangeRate":"0.74","fee":"0"}',
    });

    const response = await POST(request, { params: Promise.resolve({ route: ['transfers'] }) });

    expect(ledger).toHaveBeenCalledTimes(1);
    const [target, init] = ledger.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(target)).toBe('http://ledger.test/v1/transfers');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${MAI_ACCESS_TOKEN}`);
    expect(headers.get('idempotency-key')).toBe('k-1');

    expect(response.status).toBe(403);
    expect(await response.text()).toBe(FORBIDDEN_BODY);
  });

  it('harness control: a posting record, already on the list, is forwarded and its 403 passed back the same way', async () => {
    const ledger = vi.fn(async () => new Response(FORBIDDEN_BODY, { status: 403, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', ledger);
    const request = new NextRequest('http://console.test/api/ledger/postings', {
      method: 'POST',
      headers: { cookie: 'sessionId=signed-session-cookie', 'idempotency-key': 'k-1', 'content-type': 'application/json' },
      body: '{}',
    });

    const response = await POST(request, { params: Promise.resolve({ route: ['postings'] }) });

    expect(ledger).toHaveBeenCalledTimes(1);
    expect(new Headers((ledger.mock.calls[0] as unknown as [URL, RequestInit])[1].headers).get('authorization')).toBe(`Bearer ${MAI_ACCESS_TOKEN}`);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe(FORBIDDEN_BODY);
  });
});
