import { beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_CONFIG = { redisUrl: 'redis://fake', redisKeyPrefix: 'console:' };
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

const { createSession, destroySession, getSession, SESSION_COOKIE_NAME } = await import('./session');

beforeEach(() => {
  store.clear();
  ttls.clear();
});

const baseInput = {
  displayName: 'Mai Nguyen',
  signInName: 'mai@drunkcoding.net',
  directoryObjectId: '11111111-1111-4111-8111-111111111111',
  tenantName: 'Drunk Coding',
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

describe('SESSION_COOKIE_NAME', () => {
  it('is "sessionId" — the only thing that ever crosses to the browser (R3)', () => {
    expect(SESSION_COOKIE_NAME).toBe('sessionId');
  });
});

describe('createSession/getSession/destroySession', () => {
  it('opens a session under the console prefix and reads it back', async () => {
    const session = await createSession(baseInput);
    expect(session.sessionId).toBeTruthy();
    expect(store.has(`console:session:${session.sessionId}`)).toBe(true);

    const read = await getSession(session.sessionId);
    expect(read).toEqual(session);
  });

  it('a miss (unknown id) returns null, never a fallback (R7 spirit)', async () => {
    expect(await getSession('unknown-id')).toBeNull();
  });

  it('destroySession removes the record', async () => {
    const session = await createSession(baseInput);
    await destroySession(session.sessionId);
    expect(await getSession(session.sessionId)).toBeNull();
  });

  it('assigns a fresh sessionId each time, never reusing input', async () => {
    const a = await createSession(baseInput);
    const b = await createSession(baseInput);
    expect(a.sessionId).not.toBe(b.sessionId);
  });

  it('SETEXs to input.expiresAt, not some other duration', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 120;
    const session = await createSession({ ...baseInput, expiresAt });
    const ttl = ttls.get(`console:session:${session.sessionId}`)!;
    // Allow a couple of seconds of test-runtime slack either side of the exact 120s delta.
    expect(ttl).toBeGreaterThan(115);
    expect(ttl).toBeLessThanOrEqual(120);
  });

  it('floors the TTL at 1 second for an expiresAt already in the past', async () => {
    const session = await createSession({ ...baseInput, expiresAt: Math.floor(Date.now() / 1000) - 999 });
    expect(ttls.get(`console:session:${session.sessionId}`)).toBe(1);
  });
});
