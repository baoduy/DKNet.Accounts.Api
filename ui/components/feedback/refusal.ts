import type { LedgerError } from './RefusalAlert';

/**
 * The retry decision (§3 row 11): a timeout, a transport failure or `LOCK_TIMEOUT` may
 * offer retry; a business refusal — the service having reached and reported a decision —
 * may not.
 */
export type AttemptFailure =
  | { kind: 'timeout' }
  | { kind: 'transport' }
  | { kind: 'refusal'; errors: LedgerError[] };

export function classifyFailure(_failure: AttemptFailure): boolean {
  throw new Error('Not implemented: classifyFailure');
}
