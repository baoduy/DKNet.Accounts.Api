import type { CSSProperties, ReactNode } from 'react';

/**
 * Displays the key minted **on form mount**. This is the non-obvious rule on Record
 * posting: minting on submit means a double-click sends two distinct keys and records
 * two postings — exactly what idempotency exists to prevent.
 *
 * The key survives a failed submit on purpose. If the first attempt actually landed,
 * resubmitting a corrected body answers 409 `IDEMPOTENCY_KEY_CONFLICT`, which is the
 * right answer, not a duplicate.
 */
export interface IdempotencyKeyFieldProps {
  /** The minted key. Mint it on mount, never on submit. */
  value: string;
  /** Only wire this to a reset-after-success path. */
  onRegenerate?: () => void;
  note?: ReactNode;
  style?: CSSProperties;
}
export declare function IdempotencyKeyField(props: IdempotencyKeyFieldProps): JSX.Element;
