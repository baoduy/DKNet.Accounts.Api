import type { CSSProperties } from 'react';

export type IconName =
  | 'layout-dashboard'
  | 'folder'
  | 'wallet'
  | 'arrow-left-right'
  | 'coins'
  | 'file-text'
  | 'search'
  | 'chevron-down'
  | 'chevron-right'
  | 'x'
  | 'copy'
  | 'check'
  | 'triangle-alert'
  | 'plus'
  | 'arrow-right'
  | 'info'
  | 'rotate-ccw'
  | 'lock'
  | 'calendar'
  | 'snowflake';

export declare const ICON_PATHS: Record<IconName, string>;

/**
 * A Lucide glyph at the console's 1.5 stroke weight.
 */
export interface IconProps {
  /** Lucide glyph name. Only the console's own set is bundled. */
  name: IconName;
  /** 16 inline and in nav, 20 beside a page title. */
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element | null;
