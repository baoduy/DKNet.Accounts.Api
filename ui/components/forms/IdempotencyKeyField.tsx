import type { CSSProperties, JSX, ReactNode } from 'react';

export interface IdempotencyKeyFieldProps {
  /** The minted key. Mint it on mount, never on submit. */
  value: string;
  /** Only wire this to a reset-after-success path. */
  onRegenerate?: () => void;
  note?: ReactNode;
  style?: CSSProperties;
}

export function IdempotencyKeyField(_props: IdempotencyKeyFieldProps): JSX.Element {
  throw new Error('Not implemented: IdempotencyKeyField');
}
