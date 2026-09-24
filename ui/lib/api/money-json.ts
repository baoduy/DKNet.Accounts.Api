/**
 * DRK-1697 §3 row 7 — reads a ledger response body as text and yields each numeric literal
 * as its exact source text, so an amount never passes through a JS `number` (R1: an amount
 * renders from the exact text the service sent).
 */

/**
 * Marks every JSON number literal outside a string as a quoted string carrying this prefix,
 * so `JSON.parse` never runs its own numeric coercion over it — the reviver below strips the
 * marker back off once `JSON.parse` has done the structural work (braces, commas, escapes).
 */
const NUMBER_MARKER = '\u0000ledger-number:';

function markNumberLiterals(text: string): string {
  let out = '';
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += text[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const start = i;
      if (text[i] === '-') i += 1;
      while (text[i] >= '0' && text[i] <= '9') i += 1;
      if (text[i] === '.') {
        i += 1;
        while (text[i] >= '0' && text[i] <= '9') i += 1;
      }
      if (text[i] === 'e' || text[i] === 'E') {
        i += 1;
        if (text[i] === '+' || text[i] === '-') i += 1;
        while (text[i] >= '0' && text[i] <= '9') i += 1;
      }
      out += JSON.stringify(NUMBER_MARKER + text.slice(start, i));
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * Parses `text` (a JSON document read verbatim from the ledger response) into a value where
 * every JSON number becomes a string holding its exact source digits — never routed through
 * `JSON.parse`'s own numeric coercion, which silently drops precision past 2^53.
 */
export function parseLedgerJsonPreservingNumbers(text: string): unknown {
  return JSON.parse(markNumberLiterals(text), (_key, value) =>
    typeof value === 'string' && value.startsWith(NUMBER_MARKER) ? value.slice(NUMBER_MARKER.length) : value,
  );
}

/**
 * Reads `response`'s body as text and parses it through `parseLedgerJsonPreservingNumbers`.
 * A `204 No Content` (e.g. `DELETE /v1/account-groups/{id}`) has no body to parse — `null`
 * stands in for it rather than a `JSON.parse` syntax error on empty text.
 */
export async function readLedgerJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return text.length === 0 ? null : parseLedgerJsonPreservingNumbers(text);
}

/** Whether a decimal-string amount is exactly zero — never routed through `Number` (R1). */
export function isZeroAmount(amount: string): boolean {
  return /^[-+]?0(\.0+)?$/.test(amount);
}

/**
 * The 2xx range, computed from `status` alone — never `response.ok`, which a hand-built test
 * double (`{ status, text }`, no `ok` getter) never carries, unlike a real `fetch` `Response`
 * (DRK-1704 finding 5/9).
 */
export function isOkStatus(status: number): boolean {
  return status >= 200 && status < 300;
}
