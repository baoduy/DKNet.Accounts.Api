import type { CSSProperties, ReactNode } from 'react';

export interface FilterFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function FilterField(props: FilterFieldProps): JSX.Element;

/**
 * A table's filters, collected behind one button at the right of the card bar. The search
 * field keeps the left of the bar; everything that narrows the list lives in here, so a
 * table with five filters reads the same as a table with one.
 *
 * `activeCount` is the number of filters away from their default. It shows as a count on
 * the button, which is what tells a reader the list they are looking at is narrowed —
 * a closed panel hides the reason a row is missing otherwise.
 */
export interface FilterMenuProps {
  /** Filters currently away from their default. Drives the count and enables Clear all. */
  activeCount?: number;
  /** Resets every filter. Omit to hide the footer. */
  onClear?: () => void;
  label?: string;
  /** `FilterField` rows. */
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function FilterMenu(props: FilterMenuProps): JSX.Element;
