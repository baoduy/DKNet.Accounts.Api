'use client';

import { Fragment, useEffect, useRef } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

/**
 * The right-hand panel a row opens. Not a modal: `TableCard`'s panel slot draws it full height
 * over the frame's right edge, nothing behind it is dimmed or blocked, and choosing another row
 * swaps the content in the same element. Esc or the close button dismisses it. Ported from Design/components/feedback/DetailPanel.jsx.
 */
export interface DetailPanelProps {
  /** Defaults to `true`, unlike the kit: screens still mount the panel only while it is open (R4). */
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
  open = true,
  title,
  children,
  onClose,
  moreHref,
  moreLabel = 'Open full page',
  actions,
  footnote,
  style,
}: DetailPanelProps): JSX.Element {
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // Esc inside a dialog opened over the panel (confirm, discard) belongs to that dialog alone.
      const dialog = (event.target as Element | null)?.closest?.('[role="dialog"]');
      if (dialog && !dialog.contains(panel.current)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const hasFooter = Boolean(actions || moreHref || footnote);
  return (
    <aside
      ref={panel}
      role="complementary"
      aria-label="Details"
      aria-hidden={!open}
      inert={!open}
      style={style}
      className={cn(
        'flex h-full min-h-0 w-full flex-col border-l border-border bg-card text-card-foreground shadow-overlay',
        'transition-transform duration-(--duration-panel) ease-(--easing-panel)',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h3 className="m-0 text-[length:var(--text-panel-title-size)] leading-[var(--text-panel-title-leading)] font-bold">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close details" className="ml-auto text-[length:var(--text-caption-size)] text-muted-foreground">
          Esc <X size={13} aria-hidden="true" />
        </Button>
      </header>
      <div className="flex-1 overflow-auto p-(--card-padding)">{children}</div>
      {hasFooter ? (
        <footer className="flex flex-col gap-3 border-t border-border bg-background px-4 py-3">
          {footnote ? <div className="text-[length:var(--text-caption-size)] leading-[var(--text-caption-leading)] text-muted-foreground">{footnote}</div> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {moreHref ? (
              <a href={moreHref} className="mr-auto text-[length:var(--text-table-size)] font-semibold text-link hover:underline">
                {moreLabel} →
              </a>
            ) : null}
            {actions}
          </div>
        </footer>
      ) : null}
    </aside>
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

/** The panel's key/value grid: a 132px label column, the value taking the rest. */
export function DetailList({ items, style }: DetailListProps): JSX.Element {
  return (
    <dl style={style} className="m-0 grid grid-cols-[8.25rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-[length:var(--text-table-size)] leading-[var(--text-table-leading)]">
      {items.map((item, index) => (
        <Fragment key={index}>
          <dt className="m-0 text-muted-foreground">{item.label}</dt>
          <dd className="m-0">{item.value}</dd>
        </Fragment>
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

/** The 11px tracked heading between groups of panel fields. */
export function DetailSection({ children, divider = true, style }: DetailSectionProps): JSX.Element {
  return (
    <h4
      style={style}
      className={cn(
        'mx-0 mt-4.5 mb-2 text-[length:var(--text-label-size)] leading-[var(--text-label-leading)] font-semibold tracking-[var(--tracking-label)] text-muted-foreground uppercase',
        divider && 'mt-5 border-t border-border pt-4',
      )}
    >
      {children}
    </h4>
  );
}
