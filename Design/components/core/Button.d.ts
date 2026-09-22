import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

/**
 * The console's button. Never pill-shaped — `radius-full` belongs to status badges,
 * which is how a reader tells a control from a label.
 */
export interface ButtonProps {
  /** `primary` is reserved for the action that moves money or creates a record — one per screen. */
  variant?: 'default' | 'primary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  /** Disabled buttons stay visible and state their reason beside them; never hide a refused action. */
  disabled?: boolean;
  /** Renders as an anchor instead of a button. Ignored while disabled. */
  href?: string;
  /** An `<Icon>` element placed before the label. */
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: MouseEventHandler;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
