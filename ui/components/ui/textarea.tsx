import type { ComponentProps, JSX } from 'react';
import { cn } from '@/components/ui/utils';

export interface TextareaProps extends ComponentProps<'textarea'> {
  /** Draws the destructive border and sets `aria-invalid`. */
  invalid?: boolean;
}

/** Multi-line text — a posting description, a group description. Ported from Design/components/forms/Textarea.jsx. */
export function Textarea({ rows = 3, readOnly = false, disabled = false, invalid = false, className, ...props }: TextareaProps): JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      readOnly={readOnly}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full resize-y rounded-md border px-3 py-2 text-table leading-[var(--text-body-leading)] outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        invalid ? 'border-destructive' : 'border-border-control',
        readOnly || disabled ? 'bg-muted text-muted-foreground' : 'bg-card text-foreground',
        className,
      )}
      {...props}
    />
  );
}
