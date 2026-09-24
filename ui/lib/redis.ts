import Redis from 'ioredis';
import { loadConfig, type ConsoleConfig } from './config';

/**
 * The console's Redis client. Every key written by the console lives under
 * `config.redisKeyPrefix` (R6) — session records, cached tokens, and nothing else.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  setex(key: string, ttlSeconds: number, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  quit(): Promise<unknown>;
}

let client: RedisLike | undefined;

/**
 * Lazily creates (or returns) the shared Redis client for `CONSOLE_REDIS_URL`. Takes no
 * argument — the URL never changes for the life of a process, and a per-call `config`
 * parameter that only the first caller's value ever took effect was misleading.
 */
export function getRedisClient(): RedisLike {
  if (!client) {
    client = new Redis(loadConfig().redisUrl, { lazyConnect: false, maxRetriesPerRequest: 2 }) as unknown as RedisLike;
  }
  return client;
}

/** Builds a key under the console's own prefix — the only shape the console ever writes. */
export function prefixedKey(config: Pick<ConsoleConfig, 'redisKeyPrefix'>, ...parts: string[]): string {
  return `${config.redisKeyPrefix}${parts.join(':')}`;
}
