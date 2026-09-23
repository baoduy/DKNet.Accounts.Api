/**
 * `ConsoleSession` — DRK-1669 §3a. Held in Redis under the console's prefix, never in
 * process memory (so a restart or a second instance never signs anyone out).
 */
export interface ConsoleSession {
  sessionId: string;
  displayName: string;
  signInName: string;
  directoryObjectId: string;
  tenantName?: string;
  grantedPermissions: string[];
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = 'sessionId';

/** Opens a session record in Redis (`SETEX` to `input.expiresAt`) and returns it with a fresh `sessionId`. */
export async function createSession(input: Omit<ConsoleSession, 'sessionId'>): Promise<ConsoleSession> {
  throw new Error('Not implemented');
}

/** Reads a session by id. A miss (expired or unknown) returns `null`, never a fallback. */
export async function getSession(sessionId: string): Promise<ConsoleSession | null> {
  throw new Error('Not implemented');
}

/** Removes a session record — used by `/signout`. */
export async function destroySession(sessionId: string): Promise<void> {
  throw new Error('Not implemented');
}
