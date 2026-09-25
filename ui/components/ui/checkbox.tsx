import type { ChangeEventHandler, CSSProperties, JSX, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/ui/utils';

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
      style={style}
      className={cn(
        'relative inline-flex items-center gap-2 text-[length:var(--text-table-size)]',
        disabled ? 'cursor-not-allowed text-text-disabled' : 'cursor-pointer text-foreground',
        className,
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="peer absolute size-px opacity-0" />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-4 flex-none place-items-center rounded-xs border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring',
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
