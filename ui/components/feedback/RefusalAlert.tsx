import type { CSSProperties, JSX, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/utils';
import { ledgerErrorTraceId, toLedgerError } from '@/lib/api/refusal';

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
  /** A way to try again — every failed read offers one (DRK-1725 §3, brief Q2). */
  retry?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/** The service's wording, then its code when one came (Design/components/feedback/RefusalAlert.jsx). */
export function RefusalAlert({ errors, traceId, retry, style, className }: RefusalAlertProps): JSX.Element | null {
  const blockErrors = errors.filter((error) => !error.field);
  if (blockErrors.length === 0) return null;

  return (
    <Card role="alert" style={style} className={cn('border-destructive-solid bg-destructive/5', className)}>
      <ul className="flex flex-col gap-2">
        {blockErrors.map((error, index) => (
          <li key={index}>
            {error.message}
            {error.code ? (
              <>
                {' '}
                <span className="font-mono font-semibold">{error.code}</span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {traceId ? <p className="text-caption text-muted-foreground">Trace: {traceId}</p> : null}
      {retry ? <div>{retry}</div> : null}
    </Card>
  );
}

export interface FailedReadProps {
  /** What the read threw: a service refusal, or the service not reached at all. */
  error: unknown;
  onRetry: () => void;
  style?: CSSProperties;
}

/** DRK-1725 §3 — a read that failed, stated where its content would be, with a way to try again. */
export function FailedRead({ error, onRetry, style }: FailedReadProps): JSX.Element | null {
  return (
    <RefusalAlert
      errors={[toLedgerError(error)]}
      traceId={ledgerErrorTraceId(error)}
      style={style}
      retry={
        <Button type="button" size="sm" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}
