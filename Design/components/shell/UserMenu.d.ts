import type { CSSProperties } from 'react';

/**
 * The signed-in identity for the top bar. The console authenticates against
 * Microsoft Entra ID; the menu states the provider, the tenant, and the scopes the
 * token carries, because a refused action in this console is usually a missing scope.
 */
export interface UserMenuProps {
  /** Display name from the token's `name` claim. Initials are derived from it. */
  name: string;
  /** `preferred_username` — shown in monospace, because it gets quoted in tickets. */
  email?: string;
  /** Tenant display name. */
  tenant?: string;
  /** Identity provider, stated in full. Defaults to `Microsoft Entra ID`. */
  provider?: string;
  /** Scopes the token carries, e.g. `['accounts.read', 'postings.write']`. */
  scopes?: string[];
  /** Scopes the console knows about that this token does not carry. Rendered struck through, with the consequence stated. */
  missingScopes?: string[];
  /** The `oid` claim. Optional — shown as a copyable identifier when present. */
  objectId?: string;
  onSignOut?: () => void;
  style?: CSSProperties;
}
export declare function UserMenu(props: UserMenuProps): JSX.Element;
