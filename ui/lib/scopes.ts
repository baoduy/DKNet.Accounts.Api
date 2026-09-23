/** Pure data — safe to import from a client component, unlike `lib/oidc.ts` (Redis, openid-client). */

/** The known scope set the console can display in the identity menu (DRK-1669 §9 Q2). */
export const KNOWN_SCOPES = ['accounts.read', 'postings.read', 'postings.reverse'] as const;

/** What Mai cannot do without each known scope — stated beside a missing permission in the identity menu. */
export const SCOPE_CONSEQUENCES: Record<string, string> = {
  'accounts.read': 'view accounts',
  'postings.read': 'view postings',
  'postings.reverse': 'reverse a posting',
};
