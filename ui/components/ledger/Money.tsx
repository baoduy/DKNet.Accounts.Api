import type { CSSProperties, JSX } from 'react';
import { cn } from '@/components/ui/utils';

/** Groups a decimal amount to the currency's own precision. Never routes money through `Math.round`. */
export function formatAmount(amount: number | string, decimalPlaces = 2): string {
  const raw = typeof amount === 'number' ? amount.toString() : amount.trim();
  const unsigned = raw.startsWith('-') || raw.startsWith('+') ? raw.slice(1) : raw;
  const [intPart, fracPart = ''] = unsigned.split('.');
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const paddedFrac = fracPart.padEnd(decimalPlaces, '0');
  return decimalPlaces > 0 ? `${groupedInt}.${paddedFrac}` : groupedInt;
}

/** True for a negative amount, exact-text-safe: never routes the value through `Number`. */
export function isNegativeAmount(amount: number | string): boolean {
  return typeof amount === 'number' ? amount < 0 : amount.trim().startsWith('-');
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

export function Money({
  amount,
  currency,
  decimalPlaces = 2,
  signed = false,
  showCurrency = false,
  struck = false,
  tone,
  align,
  size = 'row',
  style,
}: MoneyProps): JSX.Element {
  const negative = isNegativeAmount(amount);
  const magnitude = formatAmount(amount, decimalPlaces);
  const sign = negative ? '−' : signed ? '+' : '';
  const resolvedTone = tone ?? (negative ? 'debit' : 'credit');

  return (
    <span
      className={cn(
        'tabular-nums',
        size === 'tile' ? 'text-[length:var(--text-tile-amount-size)]' : 'text-[length:var(--text-amount-size)]',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        struck ? 'text-reversed line-through' : resolvedTone === 'credit' ? 'text-credit' : 'text-debit',
      )}
      style={style}
    >
      {sign}
      {magnitude}
      {showCurrency && currency ? ` ${currency}` : ''}
    </span>
  );
}
