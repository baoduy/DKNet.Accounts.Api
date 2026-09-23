/**
 * DRK-1697 §3 row 7 — reads a ledger response body as text and yields each numeric literal
 * as its exact source text, so an amount never passes through a JS `number` (R1: an amount
 * renders from the exact text the service sent). Build stage implements the body; this stub
 * only pins the signature so the read layer (row 8) can compile against it.
 */

/**
 * Parses `text` (a JSON document read verbatim from the ledger response) into a value where
 * every JSON number becomes a string holding its exact source digits — never routed through
 * `JSON.parse`'s own numeric coercion, which silently drops precision past 2^53.
 */
export function parseLedgerJsonPreservingNumbers(_text: string): unknown {
  throw new Error('Not implemented — DRK-1697 Build stage (row 7).');
}

/** Reads `response`'s body as text and parses it through `parseLedgerJsonPreservingNumbers`. */
export async function readLedgerJson(_response: Response): Promise<unknown> {
  throw new Error('Not implemented — DRK-1697 Build stage (row 7).');
}
