import type { CSSProperties } from 'react';

/**
 * Identifiers are monospace because they are compared by eye: `ACME-000123` against
 * `ACME-000132` is a one-glance difference in mono and a two-read difference in a
 * proportional face. Clicking copies when there is nowhere to go, and navigates when
 * there is — a link inside a row navigates; the rest of the row opens the detail panel.
 */
export interface IdProps {
  value: string;
  href?: string;
  onNavigate?: (value: string) => void;
  style?: CSSProperties;
}
export declare function AccountNumber(props: IdProps): JSX.Element;

export interface PostingNumberProps extends IdProps {
  /** Pair with a `<StatusBadge status="Reversed" />` beside it on statement rows. */
  reversed?: boolean;
}
export declare function PostingNumber(props: PostingNumberProps): JSX.Element;
