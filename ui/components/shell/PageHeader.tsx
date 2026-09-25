import type { CSSProperties, JSX, ReactNode } from 'react';
import { CONSOLE_ICONS } from '@/components/shell/icons';

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
  const IconComponent = icon ? CONSOLE_ICONS[icon] : undefined;
  return (
    <div style={style} className="flex items-start gap-3">
      <div className="min-w-0">
        <h1 className="m-0 flex items-center gap-2 text-[length:var(--text-page-title-size)] leading-[var(--text-page-title-leading)] font-bold tracking-[var(--tracking-title)]">
          {IconComponent ? <IconComponent size={20} aria-hidden="true" data-icon={icon} /> : null}
          {title}
        </h1>
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        {description ? <div className="mt-1 text-[length:var(--text-caption-size)] text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="ml-auto flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
