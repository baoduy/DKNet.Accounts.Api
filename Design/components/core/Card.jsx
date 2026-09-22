import React from 'react';

const cardBase = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)',
  // Clip children to the radius. A table with nowrap cells inside a shrunk grid
  // track would otherwise paint straight through the border and the rounded corner.
  overflow: 'hidden'
};

export function Card({ padded = true, overlay = false, children, style, ...rest }) {
  return (
    <div style={{
      ...cardBase,
      ...(padded ? { padding: 'var(--card-padding)' } : null),
      ...(overlay ? { boxShadow: 'var(--shadow-overlay)' } : null),
      ...style
    }} {...rest}>{children}</div>
  );
}

/** A bordered strip inside an unpadded Card — the filter bar above a table, or a footer below one. */
export function CardBar({ position = 'top', children, style, ...rest }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      // Horizontal inset matches --cell-padding-x so the bar lines up with the
      // column grid of the table it sits above or below.
      padding: 'var(--space-3) var(--cell-padding-x)',
      borderBottom: position === 'top' ? '1px solid var(--border)' : undefined,
      borderTop: position === 'bottom' ? '1px solid var(--border)' : undefined,
      ...style
    }} {...rest}>{children}</div>
  );
}
