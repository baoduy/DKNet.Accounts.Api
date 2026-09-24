import React from 'react';

/**
 * ISO 4217 → ISO 3166-1 alpha-2. Codes with no country are intentionally absent:
 * XAU / XAG (gold, silver) and XDR (IMF drawing rights) have none, and EUR maps to
 * a union rather than a country. Those render the code alone in the reserved slot.
 */
export const CURRENCY_COUNTRY = {
  SGD: 'SG', USD: 'US', JPY: 'JP', BHD: 'BH', GBP: 'GB', AUD: 'AU',
  HKD: 'HK', MYR: 'MY', IDR: 'ID', THB: 'TH', PHP: 'PH', VND: 'VN',
  INR: 'IN', CNY: 'CN', KRW: 'KR', NZD: 'NZ', CHF: 'CH', CAD: 'CA',
  AED: 'AE', SAR: 'SA', ZAR: 'ZA', BRL: 'BR', MXN: 'MX'
};

function flagFor(code) {
  const cc = CURRENCY_COUNTRY[code];
  if (!cc) return null;
  return String.fromCodePoint(...cc.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function Currency({ code, showFlag = true, style, ...rest }) {
  const flag = showFlag ? flagFor(code) : null;
  return (
    <span style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', ...style }} {...rest}>
      {showFlag ? (
        <span aria-hidden="true" style={{
          display: 'inline-block', width: 19, marginRight: 2, fontSize: 14, lineHeight: 1,
          verticalAlign: '-1px',
          fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
        }}>{flag}</span>
      ) : null}
      {code}
    </span>
  );
}
