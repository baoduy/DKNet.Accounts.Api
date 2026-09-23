import type { NextRequest } from 'next/server';

/** `POST /signout` — ends the session, clears the cookie, drops the cached token (DRK-1669 §3a). */
export async function POST(request: NextRequest): Promise<Response> {
  throw new Error('Not implemented');
}
