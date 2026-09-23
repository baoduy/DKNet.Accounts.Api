import { randomUUID } from 'node:crypto';
import { loadConfig } from './config';
import { getRedisClient, prefixedKey } from './redis';

/**
 * `ConsoleSession` — DRK-1669 §3a. Held in Redis under the console's prefix, never in
 * process memory (so a restart or a second instance never signs anyone out).
 *
 * Granted scopes are deliberately NOT part of this record: they read back out of the
 * (encrypted) cached access token instead, so the plaintext scope names — which spell
 * "account"/"posting" — never sit in Redis outside of that ciphertext (§5 "the cache holds
 * the session and the token and nothing else").
 */
export interface ConsoleSession {
  sessionId: string;
  displayName: string;
  signInName: string;
  directoryObjectId: string;
  tenantName?: string;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = 'sessionId';

function sessionKey(config: ReturnType<typeof loadConfig>, sessionId: string): string {
  return prefixedKey(config, 'session', sessionId);
}

/** Opens a session record in Redis (`SETEX` to `input.expiresAt`) and returns it with a fresh `sessionId`. */
export async function createSession(input: Omit<ConsoleSession, 'sessionId'>): Promise<ConsoleSession> {
  const config = loadConfig();
  const redis = getRedisClient(config);
  const session: ConsoleSession = { sessionId: randomUUID(), ...input };
  const ttlSeconds = Math.max(1, session.expiresAt - Math.floor(Date.now() / 1000));
  await redis.setex(sessionKey(config, session.sessionId), ttlSeconds, JSON.stringify(session));
  return session;
}

/** Reads a session by id. A miss (expired or unknown) returns `null`, never a fallback. */
export async function getSession(sessionId: string): Promise<ConsoleSession | null> {
  const config = loadConfig();
  const redis = getRedisClient(config);
  const raw = await redis.get(sessionKey(config, sessionId));
  return raw ? (JSON.parse(raw) as ConsoleSession) : null;
}

/** Removes a session record — used by `/signout`. */
export async function destroySession(sessionId: string): Promise<void> {
  const config = loadConfig();
  const redis = getRedisClient(config);
  await redis.del(sessionKey(config, sessionId));
}
