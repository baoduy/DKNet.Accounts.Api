import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Checkbox({ checked = false, onChange, disabled = false, label, style, ...rest }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
      fontSize: 'var(--text-table-size)', color: disabled ? 'var(--text-disabled)' : 'var(--foreground)',
      cursor: disabled ? 'not-allowed' : 'pointer', ...style
    }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} {...rest} />
      <span style={{
        width: 16, height: 16, flex: 'none', display: 'grid', placeItems: 'center',
        border: '1px solid ' + (disabled ? 'var(--border)' : checked ? 'var(--primary)' : 'var(--border-control)'),
        borderRadius: 'var(--radius-xs)',
        background: disabled ? 'var(--surface-disabled)' : checked ? 'var(--primary)' : 'var(--card)',
        color: disabled ? 'var(--text-disabled)' : 'var(--primary-foreground)'
      }}>{checked ? <Icon name="check" size={12} strokeWidth={2.5} /> : null}</span>
      {label}
    </label>
  );
}
