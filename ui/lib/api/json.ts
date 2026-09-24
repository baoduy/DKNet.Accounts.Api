/**
 * DRK-1696 §3 row 3 / rule R1 — reads a ledger response body so every numeric JSON literal
 * keeps its source text instead of routing through a JS `number`, which loses digits past
 * `Number.MAX_SAFE_INTEGER`. Money reaches a component as a string; nothing here (or
 * downstream) may run a money field through `Number`/`parseFloat`/arithmetic.
 *
 * DRK-1704 finding 9 — this used to carry its own reviver on the `JSON.parse` source-access
 * proposal (TC39 stage 3, engine-dependent). `money-json.ts`'s marker-based
 * `parseLedgerJsonPreservingNumbers` (added by the DRK-1697 cycle) does the same job with no
 * engine dependency, so this is now a one-line delegate to it — one implementation, kept under
 * both names since the frozen `json.test.ts` imports this one.
 */
import { parseLedgerJsonPreservingNumbers } from './money-json';

export function parseLedgerJson(text: string): unknown {
  return parseLedgerJsonPreservingNumbers(text);
}
