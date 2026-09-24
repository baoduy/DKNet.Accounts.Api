import type { CSSProperties } from 'react';

export interface TabItem { value: string; label: string }

/**
 * Chip-shaped tabs — the Single / Batch switch on Record posting, and the Credit / Debit
 * direction picker. There is no underline tab style in this console.
 */
export interface TabsProps {
  items: Array<TabItem | string>;
  value: string;
  onChange?: (value: string) => void;
  style?: CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
