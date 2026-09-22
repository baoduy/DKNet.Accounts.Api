import React from 'react';

/** The 11px tracked all-caps label above a tile value or a panel section. */
export function Label({ children, style, ...rest }) {
  return (
    <div style={{
      fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label-size)',
      lineHeight: 'var(--text-label-leading)', fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)', color: 'var(--muted-foreground)',
      textTransform: 'uppercase', ...style
    }} {...rest}>{children}</div>
  );
}

/** 12px secondary prose — field captions, timestamps, row sub-text. */
export function Caption({ children, style, ...rest }) {
  return (
    <span style={{
      fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)',
      color: 'var(--muted-foreground)', ...style
    }} {...rest}>{children}</span>
  );
}

/** The explanatory paragraph that sits under a card and says why something is the way it is. */
export function Note({ children, style, ...rest }) {
  return (
    <div style={{
      fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)',
      color: 'var(--muted-foreground)', textWrap: 'pretty', ...style
    }} {...rest}>{children}</div>
  );
}

/** Identifier type: JetBrains Mono at table size. */
export function Mono({ children, style, ...rest }) {
  return <span style={{ fontFamily: 'var(--font-mono)', ...style }} {...rest}>{children}</span>;
}
