/**
 * DRK-1684 §3 row 5 — the console's own pass-through endpoint. Resolves the operator's
 * session, decrypts her access token server-side (R1), forwards `Idempotency-Key`, and
 * returns the ledger service's answer unchanged. A route `isLedgerRouteAllowed` (row 4)
 * does not declare is refused before any outbound call (R2).
 */
import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { unreachableBody } from '@/lib/api/refusal';
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

  // Next has already percent-decoded each catch-all segment, so a segment carrying its own
  // `/` or `\` (e.g. `..%2F..%2Fadmin`) is a traversal attempt, not a legitimate {param}
  // value — refuse it before the allowlist ever sees it (R2: no outbound call).
  const hasPathSeparator = route.some((segment) => segment.includes('/') || segment.includes('\\'));
  if (hasPathSeparator || !isLedgerRouteAllowed(request.method, route)) {
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

  // Built from the segments the allowlist matched, each re-encoded — never the raw path —
  // so nothing forwarded can resolve outside `/v1` on the ledger service.
  const targetUrl = new URL(`${config.apiBaseUrl}/v1/${route.map(encodeURIComponent).join('/')}`);
  targetUrl.search = request.nextUrl.search;

  const outboundHeaders = new Headers();
  outboundHeaders.set('authorization', `Bearer ${cachedToken.accessToken}`);
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) outboundHeaders.set('idempotency-key', idempotencyKey);
  const contentType = request.headers.get('content-type');
  if (contentType) outboundHeaders.set('content-type', contentType);

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
  let ledgerResponse: Response;
  let responseBody: ArrayBuffer;
  try {
    ledgerResponse = await fetch(targetUrl, { method: request.method, headers: outboundHeaders, body });
    responseBody = await ledgerResponse.arrayBuffer();
  } catch {
    // No answer at all (refused, reset or dropped connection): a refusal the console authors, in
    // the service's own shape, instead of the framework's error page (DRK-1725 §3 row 6).
    return Response.json(unreachableBody(randomUUID()), { status: 502 });
  }

  const responseHeaders = new Headers(ledgerResponse.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');
  // A 204 (e.g. `DELETE /v1/account-groups/{id}`) is spec'd to carry no body — the `Response`
  // constructor throws if handed one even when it is a zero-length buffer.
  const hasNoBody = [204, 205, 304].includes(ledgerResponse.status);
  return new Response(hasNoBody ? null : responseBody, { status: ledgerResponse.status, headers: responseHeaders });
}

export const GET = passThrough;
export const POST = passThrough;
export const PUT = passThrough;
export const PATCH = passThrough;
export const DELETE = passThrough;
