import type { CSSProperties } from 'react';

/**
 * A flat muted block matching the final layout. Tables never collapse to a spinner —
 * a table that becomes a spinner and back makes the page jump.
 */
export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  style?: CSSProperties;
}
export declare function Skeleton(props: SkeletonProps): JSX.Element;
