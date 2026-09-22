import type { CSSProperties, ReactNode } from 'react';

export interface LedgerError {
  /** e.g. `ACCOUNT_HOLDS_BALANCE`, `INSUFFICIENT_FUNDS`, `IDEMPOTENCY_KEY_CONFLICT`. */
  code?: string;
  message: string;
  /** When set, render the error on that field instead of in this block. */
  field?: string;
}

/**
 * Business refusals (422, 409) render inline where the user is, never as a toast.
 * The refusal code is always shown — it is what gets quoted in a ticket.
 * Transport and 5xx errors use this too, with `traceId` and a retry affordance.
 */
export interface RefusalAlertProps {
  errors: LedgerError[];
  /** From the API's unhandled-error response; shown copyable because the API asks the caller to quote it. */
  traceId?: string;
  /** A retry button. Only `LOCK_TIMEOUT` and transport errors get one. */
  retry?: ReactNode;
  style?: CSSProperties;
}
export declare function RefusalAlert(props: RefusalAlertProps): JSX.Element | null;
