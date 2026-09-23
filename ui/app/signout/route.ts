import { NextResponse, type NextRequest } from 'next/server';
import { loadConfig } from '@/lib/config';
import { verifyCookieValue } from '@/lib/crypto';
import { destroySession, SESSION_COOKIE_NAME } from '@/lib/session';
import { deleteAccessToken } from '@/lib/token-store';

/** `POST /signout` — ends the session, clears the cookie, drops the cached token (DRK-1669 §3a). */
export async function POST(request: NextRequest): Promise<Response> {
  const config = loadConfig();
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionId = raw ? verifyCookieValue(config.sessionSecret, raw) : null;
  if (sessionId) {
    await destroySession(sessionId);
    await deleteAccessToken(sessionId);
  }
  // A plain HTML `<form method="post">` (the identity menu's sign-out button, no client JS
  // needed) expects a navigable response, not a bare 204.
  const response = NextResponse.redirect(new URL('/signin', config.baseUrl), 303);
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: config.baseUrl.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
