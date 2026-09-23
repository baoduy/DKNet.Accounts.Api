/**
 * Runtime configuration — every value is read from the environment at startup, never
 * baked into the image (DRK-1669 §3 "Configuration", R8, R9).
 */
export interface ConsoleConfig {
  entraTenantId: string;
  entraClientId: string;
  entraClientSecret: string;
  entraScopes: string[];
  apiBaseUrl: string;
  baseUrl: string;
  redisUrl: string;
  redisKeyPrefix: string;
  sessionSecret: string;
  tokenEncryptionKey: string;
  port: number;
}

export type ConsoleConfigMode = 'configured' | 'notConfigured';

/**
 * Reads and validates every `CONSOLE_*` setting.
 *
 * R8: a missing `CONSOLE_TOKEN_ENCRYPTION_KEY` must refuse to start and name the key.
 * R9: blank tenant/client must not throw — the console still starts in `notConfigured` mode.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConsoleConfig {
  throw new Error('Not implemented');
}

/** Whether the console has enough directory values to attempt sign-in. */
export function getConfigMode(config: Pick<ConsoleConfig, 'entraTenantId' | 'entraClientId'>): ConsoleConfigMode {
  throw new Error('Not implemented');
}
