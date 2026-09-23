/**
 * DRK-1684 §3 row 5 — the console's own pass-through endpoint. Resolves the operator's
 * session, decrypts her access token server-side (R1), forwards `Idempotency-Key`, and
 * returns the ledger service's answer unchanged. A route `isLedgerRouteAllowed` (row 4)
 * does not declare is refused before any outbound call (R2).
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build turns every `@integration`
 * scenario in this slice (DRK-1679 §5) that drives this endpoint green by replacing this
 * stub with the real proxy.
 */
import type { NextRequest } from 'next/server';

interface RouteParams {
  params: Promise<{ route: string[] }>;
}

async function passThrough(_request: NextRequest, _context: RouteParams): Promise<Response> {
  throw new Error('Not implemented: DRK-1684 §3 row 5 — ledger pass-through endpoint');
}

export const GET = passThrough;
export const POST = passThrough;
export const PATCH = passThrough;
export const DELETE = passThrough;
