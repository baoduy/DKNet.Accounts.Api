import { describe, expect, it } from 'vitest';
import { entraIssuerBaseUrl, getConfigMode, loadConfig } from './config';

/** A test env is a plain string map — `NODE_ENV` etc. from the real `ProcessEnv` are irrelevant here. */
function env(vars: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return vars as NodeJS.ProcessEnv;
}

const BASE_ENV = {
  CONSOLE_BASE_URL: 'http://127.0.0.1:3100',
  CONSOLE_REDIS_URL: 'redis://127.0.0.1:6379',
  CONSOLE_SESSION_SECRET: 'session-secret',
  CONSOLE_TOKEN_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
};

describe('loadConfig', () => {
  it('reads every CONSOLE_* value from the given environment', () => {
    const config = loadConfig(
      env({
        ...BASE_ENV,
        CONSOLE_ENTRA_TENANT_ID: 'tenant',
        CONSOLE_ENTRA_CLIENT_ID: 'client',
        CONSOLE_ENTRA_CLIENT_SECRET: 'secret',
        CONSOLE_ENTRA_SCOPES: 'accounts.read postings.read',
        CONSOLE_API_BASE_URL: 'http://127.0.0.1:8080',
        CONSOLE_REDIS_KEY_PREFIX: 'console:',
        CONSOLE_PORT: '3100',
      }),
    );

    expect(config).toEqual({
      entraTenantId: 'tenant',
      entraClientId: 'client',
      entraClientSecret: 'secret',
      entraScopes: ['accounts.read', 'postings.read'],
      apiBaseUrl: 'http://127.0.0.1:8080',
      baseUrl: 'http://127.0.0.1:3100',
      redisUrl: 'redis://127.0.0.1:6379',
      redisKeyPrefix: 'console:',
      sessionSecret: 'session-secret',
      tokenEncryptionKey: '0123456789abcdef0123456789abcdef',
      port: 3100,
    });
  });

  it.each(['CONSOLE_BASE_URL', 'CONSOLE_REDIS_URL', 'CONSOLE_SESSION_SECRET', 'CONSOLE_TOKEN_ENCRYPTION_KEY'])(
    'refuses to start naming the missing %s (R8)',
    (name) => {
      const vars: Record<string, string | undefined> = { ...BASE_ENV };
      delete vars[name];
      expect(() => loadConfig(env(vars))).toThrow(new RegExp(name));
    },
  );

  it('defaults entraScopes, redisKeyPrefix and port when unset', () => {
    const config = loadConfig(env(BASE_ENV));
    expect(config.entraScopes).toEqual([]);
    expect(config.redisKeyPrefix).toBe('console:');
    expect(config.port).toBe(3000);
    expect(config.entraTenantId).toBe('');
    expect(config.entraClientId).toBe('');
  });

  it('falls back to PORT when CONSOLE_PORT is unset', () => {
    expect(loadConfig(env({ ...BASE_ENV, PORT: '4000' })).port).toBe(4000);
  });
});

describe('getConfigMode', () => {
  it('is "configured" once both tenant and client id are set (R9)', () => {
    expect(getConfigMode({ entraTenantId: 't', entraClientId: 'c' })).toBe('configured');
  });

  it.each([
    { entraTenantId: '', entraClientId: 'c' },
    { entraTenantId: 't', entraClientId: '' },
    { entraTenantId: '', entraClientId: '' },
  ])('is "notConfigured" when either is blank (R9): %j', (partial) => {
    expect(getConfigMode(partial)).toBe('notConfigured');
  });
});

describe('entraIssuerBaseUrl', () => {
  it('defaults to the real Microsoft Entra ID endpoint', () => {
    expect(entraIssuerBaseUrl(env({}))).toBe('https://login.microsoftonline.com');
  });

  it('is overridable, e.g. by the acceptance suite pointing at the fake issuer', () => {
    expect(entraIssuerBaseUrl(env({ CONSOLE_ENTRA_ISSUER_BASE_URL: 'http://127.0.0.1:4488' }))).toBe('http://127.0.0.1:4488');
  });
});
