import type { CSSProperties, ChangeEventHandler } from 'react';

export interface SelectOption { value: string; label: string }

/** A single-choice control. Filters on list screens use the inline `label` form: `Status: Any`. */
export interface SelectProps {
  options: Array<SelectOption | string>;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
  /** Inline prefix inside the control, e.g. `Status:`. */
  label?: string;
  style?: CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
