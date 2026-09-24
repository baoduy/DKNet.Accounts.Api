import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

/**
 * The smallest label in the console — a posting category, an account classification,
 * or a segmented option like the 7d / 30d / All range presets.
 */
export interface ChipProps {
  /** Selected chips take the accent ground at weight 600. */
  selected?: boolean;
  /** Supplying a handler makes the chip a button; omit it for a pure label. */
  onClick?: MouseEventHandler;
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function Chip(props: ChipProps): JSX.Element;
