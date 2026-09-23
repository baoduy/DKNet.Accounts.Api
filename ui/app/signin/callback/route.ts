import type { NextRequest } from 'next/server';

/**
 * `GET /signin/callback` — receives the directory's answer and opens a session
 * (DRK-1669 §3a). Refuses an answer whose `state` has no server-side record (R4).
 */
export async function GET(request: NextRequest): Promise<Response> {
  throw new Error('Not implemented');
}
