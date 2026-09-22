import React from 'react';

export function Breadcrumb({ items = [], onNavigate, style, ...rest }) {
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 'var(--text-table-size)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...style }} {...rest}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={it.label + i}>
            {i > 0 ? <span style={{ padding: '0 6px' }}>/</span> : null}
            {last || (!it.href && !onNavigate)
              ? <b style={{ color: 'var(--foreground)', fontWeight: 'var(--weight-semibold)' }}>{it.label}</b>
              : <a href={it.href || '#'} style={{ color: 'var(--link)' }}
                  onClick={onNavigate ? (e) => { e.preventDefault(); onNavigate(it); } : undefined}>{it.label}</a>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
