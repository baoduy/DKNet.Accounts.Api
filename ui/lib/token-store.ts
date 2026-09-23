/**
 * `CachedAccessToken` — DRK-1669 §3a. AES-256-GCM encrypted before it ever reaches Redis
 * (R8), TTL pinned to the token's own `exp` (R7) — a read past expiry is a miss, never a
 * fallback.
 */
export interface CachedAccessToken {
  sessionId: string;
  encryptedToken: string;
  encryptedRefreshToken?: string;
  expiresAt: number;
}

/** Encrypts and stores the access token (and refresh token, if any) for a session. */
export async function storeAccessToken(
  sessionId: string,
  accessToken: string,
  expiresAt: number,
  refreshToken?: string,
): Promise<void> {
  throw new Error('Not implemented');
}

/** Reads and decrypts the cached token for a session. Expired or missing → `null`. */
export async function getAccessToken(sessionId: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  throw new Error('Not implemented');
}

/** Drops the cached token for a session — used by `/signout`. */
export async function deleteAccessToken(sessionId: string): Promise<void> {
  throw new Error('Not implemented');
}
