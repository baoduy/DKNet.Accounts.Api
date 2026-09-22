import React from 'react';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { Caption } from '../core/Label.jsx';

/** One labelled row inside the filter panel. */
export function FilterField({ label, hint, children, style, ...rest }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)', ...style }} {...rest}>
      <Caption>{label}</Caption>
      {children}
      {hint ? <Caption>{hint}</Caption> : null}
    </div>
  );
}

/**
 * The single filter control for a table: one button at the right of the card bar that opens
 * a panel holding every filter. Replaces a row of inline selects, which crowds the bar and
 * pushes the search field off the left edge.
 */
export function FilterMenu({ activeCount = 0, onClear, label = 'Filter', children, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', ...style }} {...rest}>
      <Button
        onClick={() => setOpen((v) => !v)}
        icon={<Icon name="filter" size={14} />}
        aria-expanded={open}
        aria-haspopup="true"
        style={open ? { background: 'var(--surface-selected)' } : null}
      >
        {label}
        {activeCount > 0 ? (
          <span style={{
            minWidth: 18, height: 18, padding: '0 5px', borderRadius: 'var(--radius-full)',
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            fontSize: 11, fontWeight: 'var(--weight-semibold)', lineHeight: '18px',
            textAlign: 'center', fontVariantNumeric: 'tabular-nums'
          }}>{activeCount}</span>
        ) : null}
        <Icon name="chevron-down" size={14} style={{ color: 'var(--muted-foreground)' }} />
      </Button>
      {open ? (
        <div
          role="group"
          aria-label={label}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 40, width: 272,
            background: 'var(--popover)', color: 'var(--popover-foreground)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-overlay)', padding: 'var(--card-padding)',
            display: 'grid', gap: 'var(--space-4)'
          }}
        >
          {children}
          {onClear ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <Caption>{activeCount > 0 ? activeCount + ' filter' + (activeCount === 1 ? '' : 's') + ' applied' : 'No filters applied'}</Caption>
              <Button size="sm" variant="ghost" disabled={activeCount === 0} onClick={onClear} style={{ marginLeft: 'auto' }}>Clear all</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
