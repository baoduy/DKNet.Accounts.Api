import React from 'react';
import { Button } from '../core/Button.jsx';

export function Dialog({ open = true, title, children, footer, onClose, width = 520, tone, style, ...rest }) {
  React.useEffect(() => {
    if (!open || !onClose) return undefined;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div role="presentation" onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
        background: 'var(--scrim)', padding: 'var(--space-6)'
      }}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: '100%', background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-overlay)', padding: 'var(--space-6)', ...style
        }} {...rest}>
        {title ? <h2 style={{
          margin: 0, fontSize: 'var(--text-section-size)', lineHeight: 'var(--text-section-leading)',
          fontWeight: 'var(--weight-semibold)',
          color: tone === 'destructive' ? 'var(--destructive-solid)' : 'var(--foreground)'
        }}>{title}</h2> : null}
        <div style={{ marginTop: title ? 'var(--space-3)' : 0, fontSize: 'var(--text-body-size)', lineHeight: 'var(--text-section-leading)' }}>{children}</div>
        {footer !== undefined ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>{footer}</div>
        ) : onClose ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
