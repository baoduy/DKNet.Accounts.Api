import type { CSSProperties, ReactNode } from 'react';

/**
 * A filled tint pill. Every pair clears 4.5:1 in both themes.
 * A badge is never a control — it has no hover and no click.
 */
export interface BadgeProps {
  /** Severity is carried by hue: amber blocks half of what you can do, rose blocks all of it. */
  tone?: 'credit' | 'debit' | 'warning' | 'info' | 'neutral';
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
