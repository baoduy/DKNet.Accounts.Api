import type { CSSProperties, JSX } from 'react';

export interface IdProps {
  value: string;
  href?: string;
  onNavigate?: (value: string) => void;
  style?: CSSProperties;
}

export function AccountNumber(_props: IdProps): JSX.Element {
  throw new Error('Not implemented: AccountNumber');
}

export interface PostingNumberProps extends IdProps {
  /** Pair with a `<StatusBadge status="Reversed" />` beside it on statement rows. */
  reversed?: boolean;
}

export function PostingNumber(_props: PostingNumberProps): JSX.Element {
  throw new Error('Not implemented: PostingNumber');
}
