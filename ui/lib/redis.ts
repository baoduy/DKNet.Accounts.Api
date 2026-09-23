import Redis from 'ioredis';
import type { ConsoleConfig } from './config';

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

/** Lazily creates (or returns) the shared Redis client for `config.redisUrl`. */
export function getRedisClient(config: Pick<ConsoleConfig, 'redisUrl'>): RedisLike {
  if (!client) {
    client = new Redis(config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 2 }) as unknown as RedisLike;
  }
  return client;
}

/** Builds a key under the console's own prefix — the only shape the console ever writes. */
export function prefixedKey(config: Pick<ConsoleConfig, 'redisKeyPrefix'>, ...parts: string[]): string {
  return `${config.redisKeyPrefix}${parts.join(':')}`;
}
