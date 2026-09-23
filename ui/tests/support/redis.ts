import Redis from 'ioredis';
import { FAKE_REDIS_URL } from './fixtures';

export function connectTestRedis(): Redis {
  return new Redis(FAKE_REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });
}
