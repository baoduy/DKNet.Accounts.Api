import type { ChangeEventHandler, CSSProperties, JSX, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/ui/utils';

/** The native input, invisible but laid over the whole label: it takes the pointer and the keyboard itself, so the label is no second control. */
const INPUT = 'absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 outline-none disabled:cursor-not-allowed';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  label?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/** A 16px square native checkbox, `radius-xs`, filled with `--primary` when checked. Ported from Design/components/forms/Checkbox.jsx. */
export function Checkbox({ checked = false, onChange, disabled = false, label, style, className }: CheckboxProps): JSX.Element {
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
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className={INPUT} />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-4 flex-none place-items-center rounded-xs border',
          disabled
            ? 'border-border bg-surface-disabled text-text-disabled'
            : checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border-control bg-card text-primary-foreground',
        )}
      >
        {checked ? <Check size={12} strokeWidth={2.5} /> : null}
      </span>
      {label}
    </label>
  );
}
