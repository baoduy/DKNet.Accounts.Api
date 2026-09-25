import type { ChangeEventHandler, CSSProperties, JSX, ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

/** The native input, invisible but laid over the whole label: it takes the pointer and the keyboard itself, so the label is no second control. */
const INPUT = 'absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 outline-none disabled:cursor-not-allowed';

export interface SwitchProps {
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  label?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/** A 32×18 toggle for a setting that applies immediately (`Checkbox` inside a submitted form). Ported from Design/components/forms/Switch.jsx. */
export function Switch({ checked = false, onChange, disabled = false, label, style, className }: SwitchProps): JSX.Element {
  return (
    <label
      // The field shell is where the focus ring shows: the native input under it is invisible.
      data-field-shell=""
      style={style}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-sm text-[length:var(--text-table-size)] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus-ring',
        disabled ? 'text-text-disabled' : 'text-foreground',
        className,
      )}
    >
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} className={INPUT} />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-4.5 w-8 flex-none rounded-full border transition-colors',
          disabled ? 'border-border bg-surface-disabled' : checked ? 'border-primary bg-primary' : 'border-border-control bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3 rounded-full transition-[left]',
            checked ? 'left-3.75' : 'left-0.5',
            disabled ? 'bg-text-disabled' : checked ? 'bg-primary-foreground' : 'bg-card',
          )}
        />
      </span>
      {label}
    </label>
  );
}
