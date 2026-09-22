import React from 'react';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';

/**
 * The right-hand panel a row opens. Not a modal: it slides in over the right edge of
 * the page, the page behind it is not dimmed or blocked, and clicking a second row
 * swaps the content without closing — the point is comparing records.
 */
export function DetailPanel({ open = false, title, children, onClose, moreHref, moreLabel = 'Open full page', actions, footnote, style, ...rest }) {
  React.useEffect(() => {
    if (!open || !onClose) return undefined;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  const hasFooter = Boolean(actions || moreHref);
  return (
    <aside role="complementary" aria-hidden={!open} aria-label="Details"
      style={{
        position: 'absolute', top: 0, right: 0, height: '100%',
        width: 'var(--drawer-width)', maxWidth: '92%',
        background: 'var(--card)', borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-overlay)', zIndex: 50,
        transform: open ? 'none' : 'translateX(100%)',
        transition: 'transform var(--duration-panel) var(--easing-panel)',
        display: 'flex', flexDirection: 'column', ...style
      }} {...rest}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-panel-title-size)', lineHeight: 'var(--text-panel-title-leading)', fontWeight: 'var(--weight-bold)' }}>{title}</h3>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close details"
          style={{ marginLeft: 'auto', color: 'var(--muted-foreground)', fontSize: 'var(--text-caption-size)' }}>
          Esc <Icon name="x" size={13} />
        </Button>
      </header>
      <div style={{ padding: 'var(--card-padding)', overflow: 'auto', flex: 1 }}>{children}</div>
      {hasFooter ? (
        <footer style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', background: 'var(--background)' }}>
          {footnote ? <div style={{ fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)', color: 'var(--muted-foreground)' }}>{footnote}</div> : null}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {moreHref ? <a href={moreHref} style={{ marginRight: 'auto', color: 'var(--link)', fontSize: 'var(--text-table-size)', fontWeight: 'var(--weight-semibold)' }}>{moreLabel} →</a> : null}
            {actions}
          </div>
        </footer>
      ) : null}
    </aside>
  );
}

/** The panel's key/value grid. */
export function DetailList({ items = [], style, ...rest }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: '132px minmax(0, 1fr)', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-table-size)', lineHeight: 'var(--text-table-leading)', margin: 0, ...style }} {...rest}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt style={{ margin: 0, color: 'var(--muted-foreground)' }}>{it.label}</dt>
          <dd style={{ margin: 0 }}>{it.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/**
 * The 11px tracked heading between groups of panel fields. A rule above it separates it
 * from the group before; pass divider={false} on the first section in a panel, where
 * there is nothing above it to divide from.
 */
export function DetailSection({ children, divider = true, style, ...rest }) {
  return <h4 style={{ margin: '18px 0 8px', fontSize: 'var(--text-label-size)', lineHeight: 'var(--text-label-leading)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-label)', color: 'var(--muted-foreground)', textTransform: 'uppercase', ...(divider ? { borderTop: '1px solid var(--border)', marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)' } : null), ...style }} {...rest}>{children}</h4>;
}
