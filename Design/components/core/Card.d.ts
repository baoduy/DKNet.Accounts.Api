import type { CSSProperties, ReactNode } from 'react';

/**
 * A card separates from the page ground by its own surface, not by elevation:
 * `--shadow-card` is barely visible in light and `none` in dark.
 */
export interface CardProps {
  /** 16px padding. Turn off when the card holds a full-bleed table. */
  padded?: boolean;
  /** Use the overlay shadow — dialogs and the detail panel only. */
  overlay?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;

export interface CardBarProps {
  /** `top` draws a bottom hairline (filter bar); `bottom` draws a top one (pager). */
  position?: 'top' | 'bottom';
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function CardBar(props: CardBarProps): JSX.Element;
