import type { ChangeEventHandler, CSSProperties, JSX, ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

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
      style={style}
      className={cn(
        'relative inline-flex items-center gap-2 text-[length:var(--text-table-size)]',
        disabled ? 'cursor-not-allowed text-text-disabled' : 'cursor-pointer text-foreground',
        className,
      )}
    >
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} className="peer absolute size-px opacity-0" />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-4.5 w-8 flex-none rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring',
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
