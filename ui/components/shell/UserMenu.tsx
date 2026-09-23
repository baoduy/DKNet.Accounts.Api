import type { CSSProperties, JSX } from 'react';

export interface UserMenuProps {
  name: string;
  email?: string;
  tenant?: string;
  provider?: string;
  scopes?: string[];
  missingScopes?: string[];
  objectId?: string;
  onSignOut?: () => void;
  style?: CSSProperties;
}

/**
 * Ported from Design/components/shell/UserMenu.jsx. `provider` defaults to
 * "Microsoft Entra ID" so the menu always names the provider in full (DRK-1669 §3).
 */
export function UserMenu(props: UserMenuProps): JSX.Element {
  throw new Error('Not implemented');
}
