import React from 'react';
import { Note } from '../core/Label.jsx';
import { formatAmount } from './Money.jsx';

const MINUS = '\u2212';

/** Mirrors AccountFloorPolicy. Returns null when the state is one the API refuses. */
export function computeFloor({ permittedToGoNegative, overdraftLimit, minimumBalance }) {
  if (!permittedToGoNegative) return minimumBalance != null ? Number(minimumBalance) : 0;
  if (overdraftLimit == null) return null; // OVERDRAFT_LIMIT_REQUIRED
  return -Number(overdraftLimit);
}

export function FloorLine({ account, decimalPlaces = 2, style, ...rest }) {
  const floor = computeFloor(account);
  const dp = account.decimalPlaces != null ? account.decimalPlaces : decimalPlaces;
  if (floor === null) {
    return (
      <Note style={style} {...rest}>
        <span style={{ color: 'var(--destructive)' }}>Overdraft limit required</span> — an account permitted to go
        negative must state its limit. The API refuses this state with{' '}
        <span style={{ fontFamily: 'var(--font-mono)' }}>OVERDRAFT_LIMIT_REQUIRED</span>.
      </Note>
    );
  }
  const shown = (floor < 0 ? MINUS : '') + formatAmount(floor, dp) + ' ' + account.currency;
  const because = account.permittedToGoNegative
    ? 'permitted to go negative, overdraft limit ' + formatAmount(account.overdraftLimit, dp)
    : account.minimumBalance != null
      ? 'minimum balance ' + formatAmount(account.minimumBalance, dp)
      : 'not permitted to go negative, no minimum balance set';
  return (
    <Note style={style} {...rest}>
      Floor <b style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{shown}</b> — {because}.
      This is the figure <span style={{ fontFamily: 'var(--font-mono)' }}>INSUFFICIENT_FUNDS</span> is measured against.
    </Note>
  );
}
