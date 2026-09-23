import type { CSSProperties, JSX } from 'react';

/** Groups a decimal amount to the currency's own precision. Never routes money through `Math.round`. */
export function formatAmount(_amount: number | string, _decimalPlaces = 2): string {
  throw new Error('Not implemented: formatAmount');
}

export interface MoneyProps {
  amount: number | string;
  currency?: string;
  decimalPlaces?: number;
  signed?: boolean;
  showCurrency?: boolean;
  struck?: boolean;
  tone?: 'credit' | 'debit';
  align?: 'left' | 'right';
  size?: 'row' | 'tile';
  style?: CSSProperties;
}

export function Money(_props: MoneyProps): JSX.Element {
  throw new Error('Not implemented: Money');
}
