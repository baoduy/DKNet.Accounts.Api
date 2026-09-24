/** Pure data — safe to import from a client component, unlike `lib/oidc.ts` (Redis, openid-client). */

/**
 * The known scope set the console can display in the identity menu (DRK-1669 §9 Q2) — all 5
 * the service defines (`ScopeNames.All`, `SampleAuthorizationRequirement.cs:19-20`), DRK-1684
 * §3 row 11.
 */
export const KNOWN_SCOPES = ['accounts.read', 'accounts.write', 'postings.read', 'postings.write', 'postings.reverse'] as const;

/** What Mai cannot do without each known scope — stated beside a missing permission in the identity menu. */
export const SCOPE_CONSEQUENCES: Record<string, string> = {
  'accounts.read': 'view accounts',
  'accounts.write': 'create or change an account, a group or a currency',
  'postings.read': 'view postings',
  'postings.write': 'record a posting',
  'postings.reverse': 'reverse a posting',
};
