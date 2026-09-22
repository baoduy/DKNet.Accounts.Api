import React from 'react';

const badgeBase = {
  display: 'inline-block', fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)',
  fontWeight: 'var(--weight-medium)', padding: '2px 8px',
  borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap'
};

const badgeTones = {
  credit: { background: 'var(--badge-credit-bg)', color: 'var(--badge-credit-fg)' },
  debit: { background: 'var(--badge-debit-bg)', color: 'var(--badge-debit-fg)' },
  warning: { background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-fg)' },
  info: { background: 'var(--badge-info-bg)', color: 'var(--badge-info-fg)' },
  neutral: { background: 'var(--badge-neutral-bg)', color: 'var(--badge-neutral-fg)' }
};

export function Badge({ tone = 'neutral', children, style, ...rest }) {
  return <span style={{ ...badgeBase, ...badgeTones[tone], ...style }} {...rest}>{children}</span>;
}
