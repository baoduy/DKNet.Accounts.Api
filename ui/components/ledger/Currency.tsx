import type { CSSProperties, JSX } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/components/ui/utils';

/**
 * Every ISO 4217 currency issued by a single country. ISO 4217 builds each of these codes from the
 * issuer's ISO 3166-1 alpha-2 code plus one letter (SGD = SG + D), so the country is the first two
 * letters. EUR is added below with the EU flag. Every other code — the X- codes (metals, SDR, the
 * CFA and East Caribbean francs several countries share), ANG (its "AN" country no longer exists)
 * and non-ISO codes such as USDT — has no flag and shows the generic currency icon instead.
 */
const NATIONAL_CURRENCIES = `
  AED AFN ALL AMD AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD
  CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB FJD FKP GBP GEL GHS GIP GMD
  GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD
  KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO
  NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE
  SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VED VES VND
  VUV WST YER ZAR ZMW ZWG
`.trim().split(/\s+/);

/** ISO 4217 → ISO 3166-1 alpha-2, for the codes above only. */
export const CURRENCY_COUNTRY: Record<string, string> = {
  ...Object.fromEntries(NATIONAL_CURRENCIES.map((code) => [code, code.slice(0, 2)])),
  EUR: 'EU',
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
        // Drawn by CSS (or an SVG), never as text: the element's text stays the bare code — what a
        // copy or a text match reads — and the mark stays decorative. Every code gets a mark.
        <span aria-hidden="true" data-flag={country ? flagEmoji(country) : undefined} className="inline-flex w-5 justify-center text-muted-foreground before:content-[attr(data-flag)]">
          {country ? null : <Coins size={14} />}
        </span>
      ) : null}
      <span>{code}</span>
    </span>
  );
}
