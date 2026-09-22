import type { CSSProperties, ChangeEventHandler } from 'react';

/** Multi-line text — a posting description, a group description. */
export interface TextareaProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  rows?: number;
  readOnly?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  style?: CSSProperties;
}
export declare function Textarea(props: TextareaProps): JSX.Element;
