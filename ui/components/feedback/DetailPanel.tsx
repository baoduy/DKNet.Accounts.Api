import type { CSSProperties, JSX, ReactNode } from 'react';

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

export function DetailPanel(_props: DetailPanelProps): JSX.Element {
  throw new Error('Not implemented: DetailPanel');
}

export interface DetailListItem {
  label: ReactNode;
  value: ReactNode;
}

export interface DetailListProps {
  items: DetailListItem[];
  style?: CSSProperties;
}

export function DetailList(_props: DetailListProps): JSX.Element {
  throw new Error('Not implemented: DetailList');
}

export interface DetailSectionProps {
  children?: ReactNode;
  /** A rule above the heading. Pass `false` on a panel's first section. */
  divider?: boolean;
  style?: CSSProperties;
}

export function DetailSection(_props: DetailSectionProps): JSX.Element {
  throw new Error('Not implemented: DetailSection');
}
