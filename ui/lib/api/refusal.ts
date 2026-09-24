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

/**
 * DKNet sets `field` to FluentValidation's `PropertyName`, which is PascalCase (`Code`,
 * `OwnerId`, `DecimalPlaces`, `Id`) — the screens read their form state camelCase, so this is
 * the one place that reconciles the two, once, instead of at every read site.
 */
function normaliseFieldKey(field: string): string {
  return field.charAt(0).toLowerCase() + field.slice(1);
}

export function routeRefusal(errors: LedgerError[]): RoutedRefusal {
  const fieldErrors: Record<string, LedgerError> = {};
  const alertErrors: LedgerError[] = [];
  for (const error of errors) {
    if (error.field) {
      fieldErrors[normaliseFieldKey(error.field)] = error;
    } else {
      alertErrors.push(error);
    }
  }
  return { fieldErrors, alertErrors };
}

/**
 * A refused read (list or detail) — thrown by `lib/query/groups.ts` and `lib/query/currencies.ts`
 * so the screen can still show the service's own code, or its wording plus the trace (R4),
 * instead of losing everything but a bare message string.
 */
export class LedgerRefusalError extends Error {
  code?: string;
  traceId?: string;

  constructor(message: string, code: string | undefined, traceId: string | undefined) {
    super(message);
    this.code = code;
    this.traceId = traceId;
  }
}

/** Builds the error a failed read throws, from the response body's `errors[]` / `traceId`. */
export function refusalError(body: unknown): LedgerRefusalError {
  const parsed = body as { errors?: LedgerError[]; traceId?: string } | null;
  const first = parsed?.errors?.[0];
  return new LedgerRefusalError(first?.message ?? 'Request failed.', first?.code, parsed?.traceId);
}

/** A failed read's error, reshaped for `RefusalAlert`. */
export function toLedgerError(error: unknown): LedgerError {
  if (error instanceof LedgerRefusalError) return { code: error.code, message: error.message };
  return { message: error instanceof Error ? error.message : 'Request failed.' };
}

export function ledgerErrorTraceId(error: unknown): string | undefined {
  return error instanceof LedgerRefusalError ? error.traceId : undefined;
}
