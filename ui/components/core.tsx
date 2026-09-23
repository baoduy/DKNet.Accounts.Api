import type { CSSProperties, JSX, ReactNode } from 'react';

/** Lucide, 1.5 stroke — the subset the console's shell actually uses. Ported from Design/components/core/Icon.jsx. */
const ICON_PATHS: Record<string, string> = {
  'layout-dashboard':
    '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  folder:
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  wallet:
    '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  'arrow-left-right': '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  coins:
    '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
};

export interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, strokeWidth = 1.5, style }: IconProps): JSX.Element | null {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}

/** The 11px tracked all-caps label above a tile value or a panel section. Ported from Design/components/core/Label.jsx. */
export function Label({ children, style }: { children?: ReactNode; style?: CSSProperties }): JSX.Element {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-label-size)',
        lineHeight: 'var(--text-label-leading)',
        fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-label)',
        color: 'var(--muted-foreground)',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Caption({ children, style }: { children?: ReactNode; style?: CSSProperties }): JSX.Element {
  return (
    <span style={{ fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)', color: 'var(--muted-foreground)', ...style }}>
      {children}
    </span>
  );
}

export function Note({ children, style }: { children?: ReactNode; style?: CSSProperties }): JSX.Element {
  return (
    <div style={{ fontSize: 'var(--text-caption-size)', lineHeight: 'var(--text-caption-leading)', color: 'var(--muted-foreground)', ...style }}>
      {children}
    </div>
  );
}

export function Mono({ children, style }: { children?: ReactNode; style?: CSSProperties }): JSX.Element {
  return <span style={{ fontFamily: 'var(--font-mono)', ...style }}>{children}</span>;
}

export function Separator({ style }: { style?: CSSProperties }): JSX.Element {
  return <div role="separator" aria-orientation="horizontal" style={{ height: 1, width: '100%', background: 'var(--border)', ...style }} />;
}

export interface ChipProps {
  selected?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Chip({ selected = false, children, style }: ChipProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-label-size)',
        lineHeight: 'var(--text-label-leading)',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: selected ? 'var(--surface-selected)' : 'var(--muted)',
        color: selected ? 'var(--foreground)' : 'var(--muted-foreground)',
        fontWeight: selected ? 'var(--weight-semibold)' : 'var(--weight-regular)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export interface ButtonProps {
  variant?: 'default' | 'primary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

const BUTTON_SIZES: Record<NonNullable<ButtonProps['size']>, CSSProperties> = {
  sm: { padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-caption-size)' },
  md: {},
  lg: { padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-body-size)' },
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps['variant']>, CSSProperties> = {
  default: {},
  primary: { background: 'var(--primary)', borderColor: 'var(--primary)', color: 'var(--primary-foreground)' },
  ghost: { background: 'transparent', borderColor: 'transparent', color: 'var(--foreground)' },
  destructive: { background: 'var(--destructive-solid)', borderColor: 'var(--destructive-solid)', color: 'var(--destructive-foreground)' },
};

export function Button({ variant = 'default', size = 'md', icon, children, style, onClick, type = 'button', ...rest }: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-table-size)',
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 'var(--text-table-leading)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-control)',
        background: 'var(--card)',
        color: 'var(--foreground)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        ...BUTTON_VARIANTS[variant],
        ...BUTTON_SIZES[size],
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
