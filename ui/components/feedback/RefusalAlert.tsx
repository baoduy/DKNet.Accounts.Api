import type { CSSProperties, JSX, ReactNode } from 'react';
import { Card } from '@/components/ui/card';

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

export function RefusalAlert({ errors, traceId, retry, style }: RefusalAlertProps): JSX.Element | null {
  const blockErrors = errors.filter((error) => !error.field);
  if (blockErrors.length === 0) return null;

  return (
    <Card style={style} className="border-destructive-solid bg-destructive/5">
      <ul className="flex flex-col gap-2">
        {blockErrors.map((error, index) => (
          <li key={index}>
            {error.code ? <span className="font-mono font-semibold">{error.code}</span> : null} {error.message}
          </li>
        ))}
      </ul>
      {traceId ? <p className="text-[length:var(--text-caption-size)] text-muted-foreground">Trace: {traceId}</p> : null}
      {retry ? <div>{retry}</div> : null}
    </Card>
  );
}
