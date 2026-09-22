import type { CSSProperties, ReactNode } from 'react';

/**
 * The console's modal. Every guarded write passes through one: record, batch, reverse,
 * close account, close group, deactivate currency. `radius-xl` (14px) and the overlay shadow.
 */
export interface DialogProps {
  open?: boolean;
  title?: ReactNode;
  children?: ReactNode;
  /** Buttons. Confirm on the right, in `primary` or `destructive`. */
  footer?: ReactNode;
  onClose?: () => void;
  width?: number;
  /** `destructive` tints the title — reserved for irreversible refusals and deletes. */
  tone?: 'default' | 'destructive';
  style?: CSSProperties;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
