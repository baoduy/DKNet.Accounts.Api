import React from 'react';

const buttonBase = {
  display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
  fontFamily: 'var(--font-sans)', fontSize: 'var(--text-table-size)',
  fontWeight: 'var(--weight-semibold)', lineHeight: 'var(--text-table-leading)',
  padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-control)', background: 'var(--card)',
  color: 'var(--foreground)', cursor: 'pointer', whiteSpace: 'nowrap',
  textDecoration: 'none', transition: 'background .12s ease, border-color .12s ease, color .12s ease'
};

const buttonVariants = {
  default: {},
  primary: { background: 'var(--primary)', borderColor: 'var(--primary)', color: 'var(--primary-foreground)' },
  ghost: { background: 'transparent', borderColor: 'transparent', color: 'var(--foreground)' },
  destructive: { background: 'var(--destructive-solid)', borderColor: 'var(--destructive-solid)', color: 'var(--destructive-foreground)' }
};

const buttonSizes = {
  sm: { padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-caption-size)' },
  md: {},
  lg: { padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-body-size)' }
};

export function Button({
  variant = 'default', size = 'md', disabled = false, href, icon,
  children, style, onClick, type = 'button', ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const hoverStyle = disabled ? null
    : variant === 'primary' ? { background: 'var(--primary-hover)', borderColor: 'var(--primary-hover)' }
    : variant === 'destructive' ? { background: 'var(--destructive-hover)', borderColor: 'var(--destructive-hover)' }
    : { background: 'var(--surface-hover)' };
  const s = {
    ...buttonBase, ...buttonVariants[variant], ...buttonSizes[size],
    ...(hover ? hoverStyle : null),
    ...(disabled ? {
      background: 'var(--surface-disabled)', borderColor: 'var(--border)',
      color: 'var(--text-disabled)', cursor: 'not-allowed'
    } : null),
    ...style
  };
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  };
  const body = (<>{icon}{children}</>);
  if (href && !disabled) {
    return <a href={href} style={s} onClick={onClick} {...handlers} {...rest}>{body}</a>;
  }
  return (
    <button type={type} style={s} disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick} {...handlers} {...rest}>{body}</button>
  );
}
