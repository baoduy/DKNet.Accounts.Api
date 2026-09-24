import React from 'react';

const MINUS = '\u2212'; // U+2212, never a hyphen

/**
 * Formats a decimal amount to the currency's own precision. Never Math.round:
 * amounts are decimal money, so the value is grouped as a string.
 */
export function formatAmount(amount, decimalPlaces = 2) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  return abs.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
}

export function Money({
  amount, currency, decimalPlaces = 2, signed = false, showCurrency = false,
  struck = false, tone, align = 'right', size = 'row', style, ...rest
}) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const negative = n < 0;
  const body = formatAmount(n, decimalPlaces);
  const sign = signed ? (negative ? MINUS : '+') : (negative ? MINUS : '');
  const resolvedTone = tone || (signed ? (negative ? 'debit' : 'credit') : null);
  const colour = struck ? 'var(--reversed)'
    : resolvedTone === 'credit' ? 'var(--credit)'
    : resolvedTone === 'debit' ? 'var(--debit)'
    : undefined;
  return (
    <span
      style={{
        fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"',
        fontWeight: 'var(--weight-semibold)',
        fontSize: size === 'tile' ? 'var(--text-tile-amount-size)' : 'var(--text-amount-size)',
        lineHeight: size === 'tile' ? 'var(--text-tile-amount-leading)' : 'var(--text-amount-leading)',
        display: 'inline-block', textAlign: align, whiteSpace: 'nowrap',
        color: colour,
        textDecoration: struck ? 'line-through' : undefined,
        ...style
      }}
      {...rest}
    >{sign}{body}{showCurrency && currency ? ' ' + currency : ''}</span>
  );
}
