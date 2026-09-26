/**
 * DRK-1760 §3 row 1 — the console's one HTTP path to the ledger pass-through (R3): every read and
 * write the browser sends to `/api/ledger/...` goes through `ledgerFetch`, and every body it
 * answers with is parsed by `readLedgerJson`, so money stays text end to end (R1).
 */
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { readLedgerJson } from './money-json';
import { refusalError } from './refusal';

/** The one `fetch` to the ledger pass-through — its arguments are handed on exactly as given. */
export function ledgerFetch(...args: Parameters<typeof fetch>): Promise<Response> {
  return fetch(...args);
}

/** A read: the parsed body, or the service's refusal thrown as a `LedgerRefusalError`. */
export async function readLedger(path: string): Promise<unknown> {
  const response = await ledgerFetch(path);
  const body = await readLedgerJson(response);
  if (!response.ok) throw refusalError(body);
  return body;
}

/** A write's answer: the parsed body (`null` for a `204`), or the refusal's `errors[]` and trace. */
export type LedgerWriteResult = { ok: true; status: number; body: unknown } | { ok: false; errors?: LedgerError[]; traceId?: string };

export async function sendLedgerWrite(path: string, init: RequestInit): Promise<LedgerWriteResult> {
  const response = await ledgerFetch(path, init);
  const body = await readLedgerJson(response);
  if (response.ok) return { ok: true, status: response.status, body };
  const refusal = body as { errors?: LedgerError[]; traceId?: string } | null;
  return { ok: false, errors: refusal?.errors, traceId: refusal?.traceId };
}
