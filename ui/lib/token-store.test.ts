import { beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_CONFIG = { redisUrl: 'redis://fake', redisKeyPrefix: 'console:', tokenEncryptionKey: '0123456789abcdef0123456789abcdef' };
vi.mock('./config', () => ({ loadConfig: () => TEST_CONFIG }));

const store = new Map<string, string>();
const ttls = new Map<string, number>();
vi.mock('./redis', () => ({
  getRedisClient: () => ({
    get: async (key: string) => store.get(key) ?? null,
    setex: async (key: string, ttl: number, value: string) => {
      ttls.set(key, ttl);
      store.set(key, value);
    },
    del: async (key: string) => store.delete(key),
  }),
  prefixedKey: (config: { redisKeyPrefix: string }, ...parts: string[]) => `${config.redisKeyPrefix}${parts.join(':')}`,
}));

const { deleteAccessToken, getAccessToken, storeAccessToken } = await import('./token-store');

beforeEach(() => {
  store.clear();
  ttls.clear();
});

const CANARY = 'MAI-CANARY-ACCESS-TOKEN-DO-NOT-STORE-PLAINTEXT';
const KEY = 'console:token:session-1';

describe('storeAccessToken/getAccessToken', () => {
  it('writes under console:token:<sessionId> — never stores the plaintext access token (R6, R8)', async () => {
    await storeAccessToken('session-1', CANARY, Math.floor(Date.now() / 1000) + 3600);
    expect(store.has(KEY)).toBe(true);
    expect(store.get(KEY)).not.toContain(CANARY);
  });

  it('reads the token back decrypted, refresh token included', async () => {
    await storeAccessToken('session-1', CANARY, Math.floor(Date.now() / 1000) + 3600, 'refresh-token-1');
    const result = await getAccessToken('session-1');
    expect(result).toEqual({ accessToken: CANARY, refreshToken: 'refresh-token-1' });
  });

  it('omits refreshToken from the result when none was given', async () => {
    await storeAccessToken('session-1', CANARY, Math.floor(Date.now() / 1000) + 3600);
    const result = await getAccessToken('session-1');
    expect(result?.refreshToken).toBeUndefined();
  });

  it('SETEXs to the token\'s own exp, not some other duration (R7)', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 120;
    await storeAccessToken('session-1', CANARY, expiresAt);
    const ttl = ttls.get(KEY)!;
    expect(ttl).toBeGreaterThan(115);
    expect(ttl).toBeLessThanOrEqual(120);
  });

  it('floors the TTL at 1 second for an expiresAt already in the past', async () => {
    await storeAccessToken('session-1', CANARY, Math.floor(Date.now() / 1000) - 999);
    expect(ttls.get(KEY)).toBe(1);
  });

  it('a read past the stored expiry is a miss, never a fallback (R7)', async () => {
    await storeAccessToken('session-1', CANARY, Math.floor(Date.now() / 1000) - 10);
    expect(await getAccessToken('session-1')).toBeNull();
  });

  it('a read exactly at expiry is a miss too (boundary is exclusive)', async () => {
    await storeAccessToken('session-1', CANARY, Math.floor(Date.now() / 1000));
    expect(await getAccessToken('session-1')).toBeNull();
  });

  it('a miss (unknown session) returns null', async () => {
    expect(await getAccessToken('unknown-session')).toBeNull();
  });

  it('deleteAccessToken drops the cached record', async () => {
    await storeAccessToken('session-1', CANARY, Math.floor(Date.now() / 1000) + 3600);
    await deleteAccessToken('session-1');
    expect(store.has(KEY)).toBe(false);
    expect(await getAccessToken('session-1')).toBeNull();
  });
});
