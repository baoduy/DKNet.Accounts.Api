import Redis from 'ioredis';
import { CONSOLE_REDIS_KEY_PREFIX, FAKE_REDIS_URL } from './fixtures';

export function connectTestRedis(): Redis {
  return new Redis(FAKE_REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });
}

/** Clears every key under the console's own prefix. Awaited by `support/test.ts`'s auto fixture. */
export async function resetConsoleRedis(): Promise<void> {
  const redis = connectTestRedis();
  try {
    const keys = await redis.keys(`${CONSOLE_REDIS_KEY_PREFIX}*`);
    if (keys.length) await redis.del(...keys);
  } finally {
    await redis.quit();
  }
}
