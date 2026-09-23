import type { CSSProperties, JSX } from 'react';

/** ISO 4217 → ISO 3166-1 alpha-2. Codes with no country are deliberately not listed. */
export const CURRENCY_COUNTRY: Record<string, string> = {};

export interface CurrencyProps {
  code: string;
  showFlag?: boolean;
  style?: CSSProperties;
}

export function Currency(_props: CurrencyProps): JSX.Element {
  throw new Error('Not implemented: Currency');
}
