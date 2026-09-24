import type { CSSProperties } from 'react';

/** A 1px hairline in `--border`. Structure in this console is drawn with hairlines, not shadows. */
export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  style?: CSSProperties;
}
export declare function Separator(props: SeparatorProps): JSX.Element;
