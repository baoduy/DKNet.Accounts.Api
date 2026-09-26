import { cloneElement, isValidElement } from 'react';
import type { CSSProperties, JSX, ReactElement, ReactNode } from 'react';
import { Caption } from '@/components/ui/text';

/**
 * Gates an action on a granted OAuth scope. The UI gates on the **granted** scopes the
 * session exposes, never on what was requested.
 */
export interface ScopeGateProps {
  /** e.g. `postings.reverse`, `accounts.write`. */
  scope: string;
  granted?: boolean;
  /** Overrides the default "requires <scope>" caption. */
  reason?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}

export function ScopeGate({ scope, granted = false, reason, children, style }: ScopeGateProps): JSX.Element {
  const gated = !granted && isValidElement(children) ? cloneElement(children as ReactElement<{ disabled?: boolean }>, { disabled: true }) : children;

  return (
    <span className="inline-flex items-center gap-2" style={style}>
      {gated}
      {!granted ? <Caption>{reason ?? `requires ${scope}`}</Caption> : null}
    </span>
  );
}
