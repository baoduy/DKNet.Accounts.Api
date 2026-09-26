'use client';

import { createContext, useContext, useId } from 'react';
import type { ChangeEventHandler, ComponentProps, CSSProperties, JSX } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<ComponentProps<'select'>, 'style' | 'children'> {
  options: Array<SelectOption | string>;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
  /** Inline prefix inside the control, e.g. `Status:`. It names the control unless `aria-label` does. */
  label?: string;
  /** Applies to the field shell, not the native control. */
  style?: CSSProperties;
}

/** The id of the enclosing `FilterField` label, so a Select inside one is named by it. */
export const FieldLabelContext = createContext<string | undefined>(undefined);

/** A native single-choice control in the console's field shell. Ported from Design/components/forms/Select.jsx. */
export function Select({ options, disabled = false, label, style, className, ...props }: SelectProps): JSX.Element {
  const prefixId = useId();
  const fieldLabelId = useContext(FieldLabelContext);
  const labelledBy = props['aria-label'] ? undefined : label ? prefixId : fieldLabelId;
  return (
    <span
      data-field-shell=""
      style={style}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border-control pr-2 pl-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
        disabled ? 'bg-muted text-muted-foreground' : 'bg-card text-foreground',
        className,
      )}
    >
      {label ? (
        <span id={prefixId} className="text-table whitespace-nowrap text-muted-foreground">
          {label}
        </span>
      ) : null}
      <select
        disabled={disabled}
        aria-labelledby={labelledBy}
        className={cn(
          'min-w-0 flex-1 appearance-none border-0 bg-transparent py-1.75 text-table text-inherit outline-none',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
        {...props}
      >
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          return (
            <option key={value} value={value}>
              {typeof option === 'string' ? option : option.label}
            </option>
          );
        })}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none flex-none text-muted-foreground" />
    </span>
  );
}
