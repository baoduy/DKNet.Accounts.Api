import type { CSSProperties, ChangeEventHandler, ReactNode } from 'react';

/** A 16px square checkbox, `radius-xs`. Filled with `--primary` when checked. */
export interface CheckboxProps {
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  label?: ReactNode;
  style?: CSSProperties;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
