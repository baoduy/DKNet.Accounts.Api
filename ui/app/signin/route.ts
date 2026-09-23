import type { NextRequest } from 'next/server';

/** `GET /signin` — sends the operator to Microsoft Entra ID (DRK-1669 §3a). Anonymous. */
export async function GET(request: NextRequest): Promise<Response> {
  throw new Error('Not implemented');
}
