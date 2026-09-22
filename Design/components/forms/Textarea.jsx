import React from 'react';

export function Textarea({ value, defaultValue, placeholder, onChange, rows = 3, readOnly = false, disabled = false, invalid = false, style, ...rest }) {
  return (
    <textarea
      value={value} defaultValue={defaultValue} placeholder={placeholder} onChange={onChange}
      rows={rows} readOnly={readOnly} disabled={disabled} aria-invalid={invalid || undefined}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-table-size)',
        lineHeight: 'var(--text-body-leading)', padding: 'var(--space-2) var(--space-3)',
        border: '1px solid ' + (invalid ? 'var(--destructive)' : 'var(--border-control)'),
        borderRadius: 'var(--radius-md)', background: readOnly || disabled ? 'var(--muted)' : 'var(--card)',
        color: readOnly || disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
        width: '100%', resize: 'vertical', ...style
      }}
      {...rest}
    />
  );
}
