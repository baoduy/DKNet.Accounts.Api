import { loadConfig } from './config';
import { decrypt, encrypt } from './crypto';
import { getRedisClient, prefixedKey } from './redis';

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

function tokenKey(config: ReturnType<typeof loadConfig>, sessionId: string): string {
  return prefixedKey(config, 'token', sessionId);
}

/** Encrypts and stores the access token (and refresh token, if any) for a session. */
export async function storeAccessToken(
  sessionId: string,
  accessToken: string,
  expiresAt: number,
  refreshToken?: string,
): Promise<void> {
  const config = loadConfig();
  const redis = getRedisClient();
  const record: CachedAccessToken = {
    sessionId,
    encryptedToken: encrypt(config.tokenEncryptionKey, accessToken),
    encryptedRefreshToken: refreshToken ? encrypt(config.tokenEncryptionKey, refreshToken) : undefined,
    expiresAt,
  };
  const ttlSeconds = Math.max(1, expiresAt - Math.floor(Date.now() / 1000));
  await redis.setex(tokenKey(config, sessionId), ttlSeconds, JSON.stringify(record));
}

/** Reads and decrypts the cached token for a session. Expired or missing → `null`. */
export async function getAccessToken(sessionId: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const config = loadConfig();
  const redis = getRedisClient();
  const raw = await redis.get(tokenKey(config, sessionId));
  if (!raw) return null;
  const record = JSON.parse(raw) as CachedAccessToken;
  if (record.expiresAt <= Math.floor(Date.now() / 1000)) return null;
  return {
    accessToken: decrypt(config.tokenEncryptionKey, record.encryptedToken),
    refreshToken: record.encryptedRefreshToken ? decrypt(config.tokenEncryptionKey, record.encryptedRefreshToken) : undefined,
  };
}

/** Drops the cached token for a session — used by `/signout`. */
export async function deleteAccessToken(sessionId: string): Promise<void> {
  const config = loadConfig();
  const redis = getRedisClient();
  await redis.del(tokenKey(config, sessionId));
}
