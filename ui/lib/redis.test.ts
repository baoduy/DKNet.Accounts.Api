import { describe, expect, it, vi } from 'vitest';

const RedisConstructor = vi.fn().mockImplementation(() => ({ id: Math.random() }));
vi.mock('ioredis', () => ({ default: RedisConstructor }));
vi.mock('./config', () => ({ loadConfig: () => ({ redisUrl: 'redis://127.0.0.1:6379' }) }));

const { getRedisClient, prefixedKey } = await import('./redis');

describe('prefixedKey', () => {
  it('joins parts under the console prefix (R6)', () => {
    expect(prefixedKey({ redisKeyPrefix: 'console:' }, 'session', 'abc-123')).toBe('console:session:abc-123');
  });

  it('supports a single part', () => {
    expect(prefixedKey({ redisKeyPrefix: 'console:' }, 'signin')).toBe('console:signin');
  });
});

describe('getRedisClient', () => {
  it('lazily creates one shared client for the process, from CONSOLE_REDIS_URL', () => {
    const a = getRedisClient();
    const b = getRedisClient();
    expect(a).toBe(b);
    expect(RedisConstructor).toHaveBeenCalledTimes(1);
    expect(RedisConstructor).toHaveBeenCalledWith('redis://127.0.0.1:6379', expect.anything());
  });
});
