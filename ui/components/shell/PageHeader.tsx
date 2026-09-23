import type { CSSProperties, JSX, ReactNode } from 'react';
import { Icon } from '@/components/core';

export interface PageHeaderProps {
  icon?: string;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
}

/** Ported from Design/components/shell/PageHeader.jsx. */
export function PageHeader({ icon, title, meta, description, actions, style }: PageHeaderProps): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', ...style }}>
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-page-title-size)',
            lineHeight: 'var(--text-page-title-leading)',
            fontWeight: 'var(--weight-bold)',
            letterSpacing: 'var(--tracking-title)',
          }}
        >
          {icon ? <Icon name={icon} size={20} /> : null}
          {title}
        </h1>
        {meta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>{meta}</div>
        ) : null}
        {description ? (
          <div style={{ fontSize: 'var(--text-caption-size)', color: 'var(--muted-foreground)', marginTop: 4 }}>{description}</div>
        ) : null}
      </div>
      {actions ? <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>{actions}</div> : null}
    </div>
  );
}
