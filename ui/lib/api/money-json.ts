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

/** A decimal-string amount as an integer count of `10^-scale` units — exact, never via `Number`. */
function toScaledUnits(amount: string, scale: number): bigint {
  const negative = amount.startsWith('-');
  const [intPart, fracPart = ''] = amount.replace(/^[-+]/, '').split('.');
  // `BigInt('')` is 0n, so a missing whole part (`.5`) or fraction reads as 0.
  const units = BigInt(intPart) * 10n ** BigInt(scale) + BigInt(fracPart.padEnd(scale, '0'));
  return negative ? -units : units;
}

/** How many digits follow the decimal point in `amount`'s text. */
export function fractionDigitsOf(amount: string): number {
  const dot = amount.indexOf('.');
  return dot < 0 ? 0 : amount.length - dot - 1;
}

/**
 * DRK-1728 §3 row 6 — `part`'s share of `part + rest`, in basis points (0 to 10000, rounded
 * down), worked out on the exact decimal text so neither amount passes through `Number` (R2);
 * only the resulting proportion does. A negative amount counts as 0; `null` when nothing is
 * left to share.
 */
export function shareBasisPoints(part: string, rest: string): number | null {
  const scale = Math.max(fractionDigitsOf(part), fractionDigitsOf(rest));
  const partUnits = toScaledUnits(part, scale);
  const restUnits = toScaledUnits(rest, scale);
  const p = partUnits > 0n ? partUnits : 0n;
  const whole = p + (restUnits > 0n ? restUnits : 0n);
  return whole === 0n ? null : Number((p * 10000n) / whole);
}
