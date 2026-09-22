import React from 'react';

const fieldBase = {
  fontFamily: 'var(--font-sans)', fontSize: 'var(--text-table-size)',
  lineHeight: 'var(--text-table-leading)', padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--border-control)', borderRadius: 'var(--radius-md)',
  background: 'var(--card)', color: 'var(--foreground)', width: '100%'
};

export function Input({
  value, defaultValue, placeholder, onChange, type = 'text',
  readOnly = false, disabled = false, invalid = false, mono = false,
  numeric = false, prefix, style, ...rest
}) {
  const control = (
    <input
      type={type} value={value} defaultValue={defaultValue} placeholder={placeholder}
      onChange={onChange} readOnly={readOnly} disabled={disabled}
      aria-invalid={invalid || undefined}
      style={{
        ...fieldBase,
        ...(mono ? { fontFamily: 'var(--font-mono)' } : null),
        ...(numeric ? { fontVariantNumeric: 'tabular-nums', textAlign: 'right' } : null),
        ...(readOnly || disabled ? { background: 'var(--muted)', color: 'var(--muted-foreground)' } : null),
        ...(invalid ? { borderColor: 'var(--destructive)' } : null),
        ...(prefix ? { border: 0, padding: 0, background: 'transparent', flex: 1, minWidth: 0 } : null),
        ...style
      }}
      {...rest}
    />
  );
  if (!prefix) return control;
  return (
    <span data-field-shell="" style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      ...fieldBase, padding: 'var(--space-2) var(--space-3)',
      ...(invalid ? { borderColor: 'var(--destructive)' } : null), ...style
    }}>
      <span style={{ color: 'var(--muted-foreground)', display: 'flex' }}>{prefix}</span>
      {control}
    </span>
  );
}

/** A non-editable value rendered in the field shell — the locked currency on Record posting. */
export function ReadOnlyField({ children, style, ...rest }) {
  return (
    <span style={{
      ...fieldBase, display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: 'var(--muted)', color: 'var(--muted-foreground)', ...style
    }} {...rest}>{children}</span>
  );
}
