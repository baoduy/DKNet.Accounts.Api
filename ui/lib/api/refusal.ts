/**
 * DRK-1684 §3 row 10 — splits a refused write's `errors[]` between the entries a specific
 * form field should show and everything else, which goes to `RefusalAlert`
 * (`components/feedback/RefusalAlert.tsx` already does the reverse filter — this is the
 * producer side a write hook composes with it).
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build turns
 * `30-refusal-naming-a-field-is-shown-on-that-field.spec.ts` green by replacing this stub.
 */
import type { LedgerError } from '@/components/feedback/RefusalAlert';

export interface RoutedRefusal {
  /** Keyed by `LedgerError.field`. */
  fieldErrors: Record<string, LedgerError>;
  /** Every entry with no `field` — passed straight to `RefusalAlert`. */
  alertErrors: LedgerError[];
}

export function routeRefusal(_errors: LedgerError[]): RoutedRefusal {
  throw new Error('Not implemented: DRK-1684 §3 row 10 — refusal routing');
}
