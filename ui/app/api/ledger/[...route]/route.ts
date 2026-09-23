/**
 * DRK-1684 §3 row 5 — the console's own pass-through endpoint. Resolves the operator's
 * session, decrypts her access token server-side (R1), forwards `Idempotency-Key`, and
 * returns the ledger service's answer unchanged. A route `isLedgerRouteAllowed` (row 4)
 * does not declare is refused before any outbound call (R2).
 */
import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { isLedgerRouteAllowed } from '@/lib/api/routes';
import { loadConfig } from '@/lib/config';
import { verifyCookieValue } from '@/lib/crypto';
import { getSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { getAccessToken } from '@/lib/token-store';

interface RouteParams {
  params: Promise<{ route: string[] }>;
}

function refusal(status: number, message: string): Response {
  return Response.json({ status, errors: [{ message }], traceId: randomUUID() }, { status });
}

async function passThrough(request: NextRequest, context: RouteParams): Promise<Response> {
  const { route } = await context.params;

  if (!isLedgerRouteAllowed(request.method, route)) {
    return refusal(404, `The console's contract does not declare ${request.method} /${route.join('/')}.`);
  }

  const config = loadConfig();
  const rawCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionId = rawCookie ? verifyCookieValue(config.sessionSecret, rawCookie) : null;
  const session = sessionId ? await getSession(sessionId) : null;
  if (!session) {
    return refusal(401, 'Not signed in.');
  }

  const cachedToken = await getAccessToken(session.sessionId);
  if (!cachedToken) {
    return refusal(401, 'Session has no valid access token.');
  }

  const targetUrl = new URL(`${config.apiBaseUrl}/v1/${route.join('/')}`);
  targetUrl.search = request.nextUrl.search;

  const outboundHeaders = new Headers();
  outboundHeaders.set('authorization', `Bearer ${cachedToken.accessToken}`);
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) outboundHeaders.set('idempotency-key', idempotencyKey);
  const contentType = request.headers.get('content-type');
  if (contentType) outboundHeaders.set('content-type', contentType);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const ledgerResponse = await fetch(targetUrl, {
    method: request.method,
    headers: outboundHeaders,
    body: hasBody ? await request.text() : undefined,
  });

  const responseBody = await ledgerResponse.arrayBuffer();
  const responseHeaders = new Headers(ledgerResponse.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');
  return new Response(responseBody, { status: ledgerResponse.status, headers: responseHeaders });
}

export const GET = passThrough;
export const POST = passThrough;
export const PATCH = passThrough;
export const DELETE = passThrough;
