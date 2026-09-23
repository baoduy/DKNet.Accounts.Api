import type { NextRequest } from 'next/server';

/** `GET /healthz` — liveness only, anonymous, no secret in the body (DRK-1669 §3a). */
export async function GET(request: NextRequest): Promise<Response> {
  throw new Error('Not implemented');
}
