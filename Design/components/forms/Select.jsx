import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Select({ options = [], value, onChange, disabled = false, label, style, ...rest }) {
  return (
    <span data-field-shell="" style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
      border: '1px solid var(--border-control)', borderRadius: 'var(--radius-md)',
      background: disabled ? 'var(--muted)' : 'var(--card)',
      color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
      padding: '0 8px 0 10px', ...style
    }}>
      {label ? <span style={{ fontSize: 'var(--text-table-size)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{label}</span> : null}
      <select
        value={value} onChange={onChange} disabled={disabled}
        style={{
          appearance: 'none', border: 0, background: 'transparent', color: 'inherit',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-table-size)',
          lineHeight: 'var(--text-table-leading)', padding: '7px 0', outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        {...rest}
      >
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      <Icon name="chevron-down" size={14} style={{ color: 'var(--muted-foreground)' }} />
    </span>
  );
}
