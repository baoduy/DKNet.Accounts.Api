import React from 'react';

export function Switch({ checked = false, onChange, disabled = false, label, style, ...rest }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
      fontSize: 'var(--text-table-size)', color: disabled ? 'var(--text-disabled)' : 'var(--foreground)',
      cursor: disabled ? 'not-allowed' : 'pointer', ...style
    }}>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} {...rest} />
      <span style={{
        width: 32, height: 18, flex: 'none', borderRadius: 'var(--radius-full)',
        background: disabled ? 'var(--surface-disabled)' : checked ? 'var(--primary)' : 'var(--muted)',
        border: '1px solid ' + (disabled ? 'var(--border)' : checked ? 'var(--primary)' : 'var(--border-control)'),
        position: 'relative', transition: 'background .12s ease'
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 15 : 2, width: 12, height: 12,
          borderRadius: 'var(--radius-full)',
          background: disabled ? 'var(--text-disabled)' : checked ? 'var(--primary-foreground)' : 'var(--card)',
          transition: 'left .12s ease'
        }} />
      </span>
      {label}
    </label>
  );
}
