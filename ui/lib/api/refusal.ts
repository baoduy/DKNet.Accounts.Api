/**
 * DRK-1684 §3 row 10 — splits a refused write's `errors[]` between the entries a specific
 * form field should show and everything else, which goes to `RefusalAlert`
 * (`components/feedback/RefusalAlert.tsx` already does the reverse filter — this is the
 * producer side a write hook composes with it).
 */
import type { LedgerError } from '@/components/feedback/RefusalAlert';

export interface RoutedRefusal {
  /** Keyed by `LedgerError.field`. */
  fieldErrors: Record<string, LedgerError>;
  /** Every entry with no `field` — passed straight to `RefusalAlert`. */
  alertErrors: LedgerError[];
}

export function routeRefusal(errors: LedgerError[]): RoutedRefusal {
  const fieldErrors: Record<string, LedgerError> = {};
  const alertErrors: LedgerError[] = [];
  for (const error of errors) {
    if (error.field) {
      fieldErrors[error.field] = error;
    } else {
      alertErrors.push(error);
    }
  }
  return { fieldErrors, alertErrors };
}
