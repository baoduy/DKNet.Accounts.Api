import type { CSSProperties, JSX, ReactNode } from 'react';

export interface LedgerError {
  /** e.g. `ACCOUNT_HOLDS_BALANCE`, `INSUFFICIENT_FUNDS`, `IDEMPOTENCY_KEY_CONFLICT`. */
  code?: string;
  message: string;
  /** When set, render the error on that field instead of in this block. */
  field?: string;
}

export interface RefusalAlertProps {
  errors: LedgerError[];
  /** From the API's unhandled-error response; shown copyable because the API asks the caller to quote it. */
  traceId?: string;
  /** A retry button. Only `LOCK_TIMEOUT` and transport errors get one. */
  retry?: ReactNode;
  style?: CSSProperties;
}

export function RefusalAlert(_props: RefusalAlertProps): JSX.Element | null {
  throw new Error('Not implemented: RefusalAlert');
}
