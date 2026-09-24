import type { CSSProperties } from 'react';

/** ISO 4217 → ISO 3166-1 alpha-2. Codes with no country are deliberately not listed. */
export declare const CURRENCY_COUNTRY: Record<string, string>;

/**
 * A currency code with its country flag. The **code is always present** — a flag alone
 * is not a currency, and several countries use the dollar. The flag is decorative and
 * `aria-hidden`. The slot is a fixed 19px whether or not a flag exists, so a column
 * stays aligned. Never use this in prose; body text uses the bare code.
 */
export interface CurrencyProps {
  /** ISO 4217, e.g. `SGD`. */
  code: string;
  /** Off in dense contexts where the flag adds nothing. */
  showFlag?: boolean;
  style?: CSSProperties;
}
export declare function Currency(props: CurrencyProps): JSX.Element;
