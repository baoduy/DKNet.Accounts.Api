import type { CSSProperties, ReactNode } from 'react';

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
export declare function ScopeGate(props: ScopeGateProps): JSX.Element;
