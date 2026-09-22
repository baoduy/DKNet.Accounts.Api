import React from 'react';

const chipBase = {
  display: 'inline-block', fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-label-size)', lineHeight: 'var(--text-label-leading)',
  padding: '2px 8px', borderRadius: 'var(--radius-full)',
  background: 'var(--muted)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap'
};

const chipSelected = {
  background: 'var(--surface-selected)', color: 'var(--foreground)', fontWeight: 'var(--weight-semibold)'
};

export function Chip({ selected = false, onClick, children, style, ...rest }) {
  const interactive = typeof onClick === 'function';
  const [hover, setHover] = React.useState(false);
  const hoverStyle = !interactive || !hover ? null
    : selected ? { background: 'var(--surface-selected-hover)' }
    : { background: 'var(--surface-hover)', color: 'var(--foreground)' };
  return (
    <span
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      style={{ ...chipBase, ...(selected ? chipSelected : null), ...(interactive ? { cursor: 'pointer', transition: 'background .12s ease' } : null), ...hoverStyle, ...style }}
      {...rest}
    >{children}</span>
  );
}
