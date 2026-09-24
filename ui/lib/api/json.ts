/**
 * DRK-1696 §3 row 3 / rule R1 — reads a ledger response body so every numeric JSON literal
 * keeps its source text instead of routing through a JS `number`, which loses digits past
 * `Number.MAX_SAFE_INTEGER`. Money reaches a component as a string; nothing here (or
 * downstream) may run a money field through `Number`/`parseFloat`/arithmetic.
 */
// The reviver's third argument (`{ source }`) is the JSON.parse source-access proposal
// (TC39 stage 3, shipped Node 21+, verified with `node -e`) — TypeScript's `lib` does not
// declare it yet, so the reviver is typed loosely and cast past `JSON.parse`'s 2-arg shape.
type SourceAwareReviver = (key: string, value: unknown, context: { source?: string }) => unknown;

const reviver: SourceAwareReviver = (_key, value, context) => (typeof value === 'number' && context.source !== undefined ? context.source : value);

export function parseLedgerJson(text: string): unknown {
  return JSON.parse(text, reviver as unknown as (key: string, value: unknown) => unknown);
}
