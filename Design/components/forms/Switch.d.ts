import type { CSSProperties, ChangeEventHandler, ReactNode } from 'react';

/** A 32×18 toggle. Use for a setting that applies immediately; use `Checkbox` inside a form that is submitted. */
export interface SwitchProps {
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  label?: ReactNode;
  style?: CSSProperties;
}
export declare function Switch(props: SwitchProps): JSX.Element;
