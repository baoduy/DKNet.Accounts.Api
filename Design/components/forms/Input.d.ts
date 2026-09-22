import type { CSSProperties, ChangeEventHandler, ReactNode } from 'react';

/**
 * The console's text field. The control border is `--border-control` (#7d8b9f), which
 * clears 3:1 in both themes — the theme's `--input` matches `--border` and is too faint.
 */
export interface InputProps {
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  /** Draws the destructive border. Pair with a `RefusalAlert` or a field-scoped message. */
  invalid?: boolean;
  /** JetBrains Mono — account numbers, codes, idempotency keys. */
  mono?: boolean;
  /** Tabular numerals, right-aligned — amounts. */
  numeric?: boolean;
  /** An `<Icon>` inside the field, e.g. search. */
  prefix?: ReactNode;
  style?: CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;

export interface ReadOnlyFieldProps { children?: ReactNode; style?: CSSProperties }
export declare function ReadOnlyField(props: ReadOnlyFieldProps): JSX.Element;
