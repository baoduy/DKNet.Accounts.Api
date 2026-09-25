import type { JSX, ReactNode } from 'react';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { Caption, Note } from '@/components/ui/text';

export interface FormRowProps {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  /** The service's refusal routed to this field: shown under it with its code. */
  error?: LedgerError;
  children?: ReactNode;
}

/** One row of the admin panels' two-column form grid (`FORM_GRID`). Ported from the `FormRow` of Design/ui_kits/account-groups-crud and currencies-crud. */
export function FormRow({ label, hint, required = false, error, children }: FormRowProps): JSX.Element {
  return (
    <>
      <Caption className="pt-2">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-destructive-solid">
            *
          </span>
        ) : null}
      </Caption>
      <div className="min-w-0">
        {children}
        {error ? (
          <p role="alert" className="mt-1.5 text-[length:var(--text-caption-size)] text-destructive-solid">
            <span className="font-mono">{error.code}</span> {error.message}
          </p>
        ) : null}
        {hint ? <Note className="mt-1.5">{hint}</Note> : null}
      </div>
    </>
  );
}

export const FORM_GRID = 'grid grid-cols-[92px_minmax(0,1fr)] gap-x-4 gap-y-3 text-[length:var(--text-table-size)]';
