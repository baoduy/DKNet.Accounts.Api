import type { CSSProperties, JSX } from 'react';

export interface CurrencyBalance {
  currency: string;
  amount: number | string;
  decimalPlaces?: number;
}

export interface CurrencyBalanceListProps {
  balances: CurrencyBalance[];
  /** Shown when the group holds no accounts. */
  emptyMessage?: string;
  style?: CSSProperties;
}

export function CurrencyBalanceList(_props: CurrencyBalanceListProps): JSX.Element {
  throw new Error('Not implemented: CurrencyBalanceList');
}
