import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * Renders the API's errors[] array. Field-scoped errors belong inline on their field;
 * everything else renders here as a block. The code is always shown — support quotes it.
 */
export function RefusalAlert({ errors = [], traceId, retry, style, ...rest }) {
  if (!errors.length && !traceId) return null;
  return (
    <div role="alert" style={{
      display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3)',
      border: '1px solid var(--destructive)', borderRadius: 'var(--radius-lg)',
      background: 'var(--card)', color: 'var(--foreground)',
      fontSize: 'var(--text-table-size)', lineHeight: 'var(--text-body-leading)', ...style
    }} {...rest}>
      <Icon name="triangle-alert" size={16} style={{ color: 'var(--destructive)', marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        {errors.map((e, i) => (
          <div key={i} style={{ marginTop: i ? 6 : 0 }}>
            {e.message}
            {e.code ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption-size)', color: 'var(--muted-foreground)', marginLeft: 6 }}>{e.code}</span> : null}
          </div>
        ))}
        {traceId ? (
          <div style={{ marginTop: 8, fontSize: 'var(--text-caption-size)', color: 'var(--muted-foreground)' }}>
            Trace <span style={{ fontFamily: 'var(--font-mono)' }}>{traceId}</span> — quote this when reporting.
          </div>
        ) : null}
        {retry ? <div style={{ marginTop: 8 }}>{retry}</div> : null}
      </div>
    </div>
  );
}
