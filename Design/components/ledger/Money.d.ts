import type { CSSProperties } from 'react';

/** Groups a decimal amount to the currency's own precision. Never routes money through `Math.round`. */
export declare function formatAmount(amount: number | string, decimalPlaces?: number): string;

/**
 * The component that matters most in this console. Its rules are non-negotiable:
 * decimals come from the currency (never a hard-coded 2), tabular numerals,
 * right-aligned in tables, and the sign is a character (+ / U+2212) — colour is a
 * second channel added on top, never the only one. Every table reads in greyscale.
 */
export interface MoneyProps {
  amount: number | string;
  /** ISO code, used only when `showCurrency` is set. */
  currency?: string;
  /** From `Currency.decimalPlaces`. JPY is 0; BHD is 3. */
  decimalPlaces?: number;
  /** Always show an explicit + or U+2212 — statement amounts do, balances do not. */
  signed?: boolean;
  showCurrency?: boolean;
  /** A reversed posting: struck through and in `--reversed`. */
  struck?: boolean;
  /** Overrides the sign-derived colour. */
  tone?: 'credit' | 'debit';
  align?: 'left' | 'right';
  /** `tile` is the 22px balance-tile size. */
  size?: 'row' | 'tile';
  style?: CSSProperties;
}
export declare function Money(props: MoneyProps): JSX.Element;
