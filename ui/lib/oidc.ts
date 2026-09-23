/**
 * Auth code + PKCE against Microsoft Entra ID (`openid-client`). `state`/`nonce`/
 * `code_verifier` are held server-side under the console's Redis prefix and each is
 * consumed exactly once (R4). Every post-sign-in redirect is resolved against
 * `CONSOLE_BASE_URL` only (R5).
 */
export interface SignInState {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

export interface SignInResult {
  session: {
    displayName: string;
    signInName: string;
    directoryObjectId: string;
    tenantName?: string;
    grantedPermissions: string[];
    expiresAt: number;
  };
  accessToken: string;
  refreshToken?: string;
}

/** Starts a sign-in: records `state` under the console's prefix, returns the redirect URL. */
export async function beginSignIn(returnTo?: string): Promise<{ redirectUrl: string; state: SignInState }> {
  throw new Error('Not implemented');
}

/**
 * Completes a sign-in from the callback's `code`/`state`. Refuses (throws) when `state`
 * has no server-side record, or has already been consumed (R4).
 */
export async function completeSignIn(params: { code: string; state: string }): Promise<SignInResult> {
  throw new Error('Not implemented');
}

/** The known scope set the console can display in the identity menu (DRK-1669 §9 Q2). */
export const KNOWN_SCOPES = ['accounts.read', 'postings.read', 'postings.reverse'] as const;
