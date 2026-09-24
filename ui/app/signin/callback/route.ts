import { NextResponse, type NextRequest } from 'next/server';
import { loadConfig } from '@/lib/config';
import { signCookieValue } from '@/lib/crypto';
import { completeSignIn } from '@/lib/oidc';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { storeAccessToken } from '@/lib/token-store';

/**
 * `GET /signin/callback` — receives the directory's answer and opens a session
 * (DRK-1669 §3a). Refuses an answer whose `state` has no server-side record (R4).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!code || !state) {
    return new NextResponse('Sign-in answer refused: missing code or state', { status: 400 });
  }

  let result;
  try {
    result = await completeSignIn({ code, state });
  } catch (error) {
    return new NextResponse(`Sign-in answer refused: ${(error as Error).message}`, { status: 400 });
  }

  const config = loadConfig();
  const session = await createSession(result.session);
  await storeAccessToken(session.sessionId, result.accessToken, session.expiresAt, result.refreshToken);

  const response = NextResponse.redirect(new URL(result.returnTo, config.baseUrl));
  response.cookies.set(SESSION_COOKIE_NAME, signCookieValue(config.sessionSecret, session.sessionId), {
    httpOnly: true,
    // `page.request`-style HTTP clients (unlike a real browser on loopback) never attach a
    // `Secure` cookie over plain HTTP — match the scheme this console is actually served on.
    secure: config.baseUrl.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    expires: new Date(session.expiresAt * 1000),
  });
  return response;
}
