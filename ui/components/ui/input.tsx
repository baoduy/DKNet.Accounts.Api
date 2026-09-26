import type { ComponentProps, JSX, ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/components/ui/utils';

export interface InputProps extends Omit<ComponentProps<'input'>, 'prefix'> {
  /** Draws the destructive border and sets `aria-invalid`. Pair with a `RefusalAlert` or a field-scoped message. */
  invalid?: boolean;
  /** JetBrains Mono — account numbers, codes, idempotency keys. */
  mono?: boolean;
  /** Tabular numerals, right-aligned — amounts. */
  numeric?: boolean;
  /** An icon inside the field, e.g. search. The input then sits in a field shell. */
  prefix?: ReactNode;
}

const FIELD = 'rounded-md border border-border-control bg-card text-table text-foreground';

/** The console's text field. Extended per Design/components/forms/Input.jsx. */
export function Input({ className, type, invalid = false, mono = false, numeric = false, prefix, style, ...props }: InputProps): JSX.Element {
  const control = (
    <input
      type={type}
      data-slot="input"
      aria-invalid={invalid || undefined}
      style={prefix ? undefined : style}
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-border-control bg-card px-3 py-1 text-table text-foreground outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:border-surface-disabled disabled:bg-surface-disabled disabled:text-text-disabled focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        mono && 'font-mono',
        numeric && 'text-right tabular-nums',
        invalid && 'border-destructive',
        // Inside the shell the shell draws the border and the focus ring.
        prefix && 'h-auto flex-1 border-0 bg-transparent p-0 focus-visible:outline-none',
        !prefix && className,
      )}
      {...props}
    />
  );
  if (!prefix) return control;
  return (
    <span
      data-field-shell=""
      style={style}
      className={cn(
        FIELD,
        'flex h-9 items-center gap-2 px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
        invalid && 'border-destructive',
        className,
      )}
    >
      <span aria-hidden="true" className="flex text-muted-foreground">
        {prefix}
      </span>
      {control}
    </span>
  );
}

export interface ReadOnlyFieldProps extends ComponentProps<'span'> {
  /** Adds the lock glyph after the value — a field fixed once the record exists (the kit's `Locked`). */
  locked?: boolean;
}

/** A non-editable value rendered in the field shell — the locked currency on Record posting. */
export function ReadOnlyField({ locked = false, className, children, ...props }: ReadOnlyFieldProps): JSX.Element {
  return (
    <span data-slot="read-only-field" className={cn(FIELD, 'inline-flex w-full items-center gap-1.5 bg-muted px-3 py-2 text-muted-foreground', className)} {...props}>
      {children}
      {locked ? <Lock size={13} aria-hidden="true" className="flex-none" /> : null}
    </span>
  );
}
