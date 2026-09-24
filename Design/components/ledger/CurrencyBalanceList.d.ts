import type { CSSProperties } from 'react';

export interface CurrencyBalance { currency: string; amount: number | string; decimalPlaces?: number }

/**
 * Group balances, one row per currency, with the not-summed note built in.
 * The note is part of the design, not commentary: the space under a column of numbers
 * is where a reader expects a total, and leaving it blank invites someone to add one.
 */
export interface CurrencyBalanceListProps {
  balances: CurrencyBalance[];
  /** Shown when the group holds no accounts. */
  emptyMessage?: string;
  style?: CSSProperties;
}
export declare function CurrencyBalanceList(props: CurrencyBalanceListProps): JSX.Element;
