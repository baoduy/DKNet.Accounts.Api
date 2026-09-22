import type { CSSProperties, ReactNode } from 'react';

/**
 * The 392px right-hand panel a table row opens. It is **not a modal**: it slides in over
 * the right edge of the page, the page behind it is neither dimmed nor blocked, clicking a
 * second row swaps the content without closing, and Esc or the close button dismisses it.
 *
 * Lifecycle actions live in this panel's bottom bar, never in the table. An action the
 * service would refuse is shown disabled with the reason and the refusal code in
 * `footnote`, rather than hidden or left to fail on click.
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
export declare function DetailPanel(props: DetailPanelProps): JSX.Element;

export interface DetailListItem { label: ReactNode; value: ReactNode }
export interface DetailListProps { items: DetailListItem[]; style?: CSSProperties }
export declare function DetailList(props: DetailListProps): JSX.Element;

export interface DetailSectionProps {
  children?: ReactNode;
  /** A rule above the heading, separating it from the group before. Pass `false` on a panel's first section. */
  divider?: boolean;
  style?: CSSProperties;
}
export declare function DetailSection(props: DetailSectionProps): JSX.Element;
