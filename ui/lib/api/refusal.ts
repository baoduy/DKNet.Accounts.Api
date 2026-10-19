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

/** A write the pass-through never answered — the service may or may not have applied it, so the
 * form keeps its idempotency key and a second confirm replays rather than applies twice (R5). */
export const NO_ANSWER_ERROR: LedgerError = { message: 'The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.' };

/** DRK-1725 §3 row 6 — what the operator reads when the ledger service cannot be reached: the
 * pass-through's own 502 answer (`app/api/ledger/[...route]/route.ts`), or a browser `TypeError`
 * when the console itself did not answer. */
export const UNREACHABLE_MESSAGE = 'The ledger service cannot be reached.';

/** The pass-through's answer when its call to the service got no answer at all. */
export function unreachableBody(traceId: string): { status: number; errors: LedgerError[]; traceId: string } {
  return { status: 502, errors: [{ message: UNREACHABLE_MESSAGE }], traceId };
}

/** A write refused with the pass-through's unreachable answer was never answered by the service —
 * it may or may not have been applied, so the form treats it as {@link NO_ANSWER_ERROR}. */
export function isUnreachable(errors: LedgerError[] | undefined): boolean {
  return errors?.length === 1 && errors[0].message === UNREACHABLE_MESSAGE && !errors[0].code;
}

/**
 * DRK-1713 §3 row 13 — the record form's codes the service sends with no `field`: an account
 * status refusal belongs on the account control, an amount or floor refusal on the amount.
 */
export const RECORD_POSTING_CODE_FIELDS: Record<string, string> = {
  ACCOUNT_FROZEN: 'accountId',
  ACCOUNT_CLOSED: 'accountId',
  ACCOUNT_DORMANT_DEBIT_REFUSED: 'accountId',
  INSUFFICIENT_FUNDS: 'amount',
  INVALID_POSTING_AMOUNT: 'amount',
};

/** `codeFields` routes a field-less entry by its code; the caller names only the codes its own
 * controls can carry, so any other form keeps showing them in its alert. */
export function routeRefusal(errors: LedgerError[], codeFields: Record<string, string> = {}): RoutedRefusal {
  const fieldErrors: Record<string, LedgerError> = {};
  const alertErrors: LedgerError[] = [];
  for (const error of errors) {
    const field = error.field ? normaliseFieldKey(error.field) : error.code ? codeFields[error.code] : undefined;
    if (field) {
      fieldErrors[field] = error;
    } else {
      alertErrors.push(error);
    }
  }
  return { fieldErrors, alertErrors };
}

/**
 * DRK-2325 R6 — the Record transfer panel's codes and the control each marks. Only `INSUFFICIENT_FUNDS`
 * and `ACCOUNT_DORMANT_DEBIT_REFUSED` mark the source: only the source is debited.
 */
export const RECORD_TRANSFER_CODE_FIELDS: Record<string, string> = {
  INVALID_POSTING_AMOUNT: 'amount',
  CONVERTED_AMOUNT_TOO_SMALL: 'amount',
  SAME_ACCOUNT_TRANSFER: 'destinationAccountId',
  EXCHANGE_RATE_REQUIRED: 'exchangeRate',
  EXCHANGE_RATE_NOT_ALLOWED: 'exchangeRate',
  INVALID_EXCHANGE_RATE: 'exchangeRate',
  INVALID_FEE: 'fee',
  FEE_ACCOUNT_REQUIRED: 'feeAccountId',
  INVALID_FEE_ACCOUNT: 'feeAccountId',
  INSUFFICIENT_FUNDS: 'sourceAccountId',
  ACCOUNT_DORMANT_DEBIT_REFUSED: 'sourceAccountId',
};

/**
 * Routes by code alone, whatever an entry's `field` says (DRK-2325 R6): a field the panel has no
 * control for (`SourceCurrency`, `IdempotencyKey`) would otherwise be dropped. Every other entry
 * goes to the alert with its `field` taken off, since `RefusalAlert` shows only field-less entries.
 */
export function routeRefusalByCode(errors: LedgerError[], codeFields: Record<string, string>): RoutedRefusal {
  const fieldErrors: Record<string, LedgerError> = {};
  const alertErrors: LedgerError[] = [];
  for (const { field: _field, ...error } of errors) {
    const control = error.code ? codeFields[error.code] : undefined;
    if (control) fieldErrors[control] = error;
    else alertErrors.push(error);
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
  // `fetch` rejects with a `TypeError` when nothing answered — the console itself is unreachable.
  if (error instanceof TypeError) return { message: UNREACHABLE_MESSAGE };
  return { message: error instanceof Error ? error.message : 'Request failed.' };
}

export function ledgerErrorTraceId(error: unknown): string | undefined {
  return error instanceof LedgerRefusalError ? error.traceId : undefined;
}
