import React from 'react';

function CopyableId({ value, href, onNavigate, children, style, ...rest }) {
  const [copied, setCopied] = React.useState(false);
  const copy = (e) => {
    if (href || onNavigate) return;
    e.preventDefault();
    if (navigator.clipboard) navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };
  const s = {
    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-table-size)',
    color: href || onNavigate ? 'var(--link)' : 'var(--foreground)',
    cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', ...style
  };
  return (
    <a href={href || '#'} title={copied ? 'Copied' : value} style={s}
      onClick={href || !onNavigate ? (onNavigate ? (e) => { e.preventDefault(); onNavigate(value); } : copy) : (e) => { e.preventDefault(); onNavigate(value); }}
      {...rest}>{children || value}{copied ? ' ✓' : ''}</a>
  );
}

/** An account number: monospace, copy-on-click, linked to the account when a target exists. */
export function AccountNumber(props) { return <CopyableId {...props} />; }

/** A posting number, optionally followed by its Reversed badge. */
export function PostingNumber({ reversed = false, ...props }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <CopyableId {...props} />
    </span>
  );
}
