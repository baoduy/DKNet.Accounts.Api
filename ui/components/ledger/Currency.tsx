import type { CSSProperties, JSX } from 'react';
import { cn } from '@/components/ui/utils';

/** ISO 4217 → ISO 3166-1 alpha-2. Codes with no country are deliberately not listed. */
export const CURRENCY_COUNTRY: Record<string, string> = {
  SGD: 'SG',
  USD: 'US',
  JPY: 'JP',
  BHD: 'BH',
  GBP: 'GB',
  AUD: 'AU',
  HKD: 'HK',
  CNY: 'CN',
  INR: 'IN',
  NZD: 'NZ',
};

function flagEmoji(countryCode: string): string {
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((char) => 127397 + char.charCodeAt(0)));
}

export interface CurrencyProps {
  code: string;
  showFlag?: boolean;
  style?: CSSProperties;
}

export function Currency({ code, showFlag = true, style }: CurrencyProps): JSX.Element {
  const country = CURRENCY_COUNTRY[code];

  return (
    <span className={cn('inline-flex items-center gap-1')} style={style}>
      {showFlag ? (
        <span aria-hidden="true" className="inline-block w-5 text-center">
          {country ? flagEmoji(country) : ''}
        </span>
      ) : null}
      <span>{code}</span>
    </span>
  );
}
