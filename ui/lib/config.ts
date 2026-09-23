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
}

/** AES-256 needs exactly 32 key bytes — `CONSOLE_TOKEN_ENCRYPTION_KEY` is used as raw UTF-8 key material (`lib/crypto.ts`). */
const TOKEN_ENCRYPTION_KEY_BYTES = 32;

export type ConsoleConfigMode = 'configured' | 'notConfigured';

/**
 * Reads and validates every `CONSOLE_*` setting.
 *
 * R8: a missing `CONSOLE_TOKEN_ENCRYPTION_KEY` must refuse to start and name the key.
 * R9: blank tenant/client must not throw — the console still starts in `notConfigured` mode.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConsoleConfig {
  const required = (name: string): string => {
    const value = env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  const tokenEncryptionKey = required('CONSOLE_TOKEN_ENCRYPTION_KEY');
  const keyBytes = Buffer.byteLength(tokenEncryptionKey, 'utf8');
  if (keyBytes !== TOKEN_ENCRYPTION_KEY_BYTES) {
    throw new Error(`CONSOLE_TOKEN_ENCRYPTION_KEY must be exactly ${TOKEN_ENCRYPTION_KEY_BYTES} bytes (utf8); got ${keyBytes}`);
  }

  return {
    entraTenantId: env.CONSOLE_ENTRA_TENANT_ID ?? '',
    entraClientId: env.CONSOLE_ENTRA_CLIENT_ID ?? '',
    entraClientSecret: env.CONSOLE_ENTRA_CLIENT_SECRET ?? '',
    entraScopes: (env.CONSOLE_ENTRA_SCOPES ?? '').split(' ').filter(Boolean),
    apiBaseUrl: env.CONSOLE_API_BASE_URL ?? '',
    baseUrl: required('CONSOLE_BASE_URL'),
    redisUrl: required('CONSOLE_REDIS_URL'),
    redisKeyPrefix: env.CONSOLE_REDIS_KEY_PREFIX ?? 'console:',
    sessionSecret: required('CONSOLE_SESSION_SECRET'),
    tokenEncryptionKey,
  };
}

/** Whether the console has enough directory values to attempt sign-in. */
export function getConfigMode(config: Pick<ConsoleConfig, 'entraTenantId' | 'entraClientId'>): ConsoleConfigMode {
  return config.entraTenantId && config.entraClientId ? 'configured' : 'notConfigured';
}

/** Real Microsoft Entra ID by default; overridden in tests to point at the fake issuer. */
export function entraIssuerBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.CONSOLE_ENTRA_ISSUER_BASE_URL ?? 'https://login.microsoftonline.com';
}
