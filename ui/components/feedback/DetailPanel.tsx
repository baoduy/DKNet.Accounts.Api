import type { CSSProperties, JSX, ReactNode } from 'react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/**
 * The right-hand panel a row opens. Content only — the sliding, non-blocking chrome is
 * `AppShell`'s `panel` slot (a shadcn `Sheet` with `modal={false}`, DRK-1679 §3 row 8);
 * this component never wraps itself in a second dialog layer.
 */
export interface DetailPanelProps {
  open?: boolean;
  title?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
  /** Where the record has a full page of its own. Currencies have none, so theirs is omitted — never a dead link. */
  moreHref?: string;
  moreLabel?: string;
  /** Buttons for the bottom bar. */
  actions?: ReactNode;
  /** The reason a disabled action is disabled, with its refusal code. */
  footnote?: ReactNode;
  style?: CSSProperties;
}

export function DetailPanel({
  title,
  children,
  onClose,
  moreHref,
  moreLabel = 'View full record',
  actions,
  footnote,
  style,
}: DetailPanelProps): JSX.Element {
  return (
    <div className="flex h-full flex-col gap-4" style={style}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[length:var(--text-panel-title-size)] font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
          Close
        </Button>
      </div>

      {moreHref ? (
        <a href={moreHref} className="text-link hover:underline">
          {moreLabel}
        </a>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">{children}</div>

      {footnote ? <p className="text-[length:var(--text-caption-size)] text-muted-foreground">{footnote}</p> : null}

      {actions ? <div className="flex items-center justify-end gap-2">{actions}</div> : null}
    </div>
  );
}

export interface DetailListItem {
  label: ReactNode;
  value: ReactNode;
}

export interface DetailListProps {
  items: DetailListItem[];
  style?: CSSProperties;
}

export function DetailList({ items, style }: DetailListProps): JSX.Element {
  return (
    <dl className="flex flex-col gap-2" style={style}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface DetailSectionProps {
  children?: ReactNode;
  /** A rule above the heading. Pass `false` on a panel's first section. */
  divider?: boolean;
  style?: CSSProperties;
}

export function DetailSection({ children, divider = true, style }: DetailSectionProps): JSX.Element {
  return (
    <div style={style}>
      {divider ? <Separator className="mb-3" /> : null}
      <div className={cn('text-[length:var(--text-section-size)] font-semibold', divider && 'mt-3')}>{children}</div>
    </div>
  );
}
