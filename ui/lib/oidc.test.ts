import { beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_CONFIG = {
  entraTenantId: 'drunk-coding-tenant',
  entraClientId: 'console-test-client',
  entraClientSecret: 'console-test-secret',
  entraScopes: ['accounts.read', 'postings.read', 'postings.reverse'],
  apiBaseUrl: 'http://127.0.0.1:8080',
  baseUrl: 'http://console.test',
  redisUrl: 'redis://fake',
  redisKeyPrefix: 'console:',
  sessionSecret: 'session-secret',
  tokenEncryptionKey: '0123456789abcdef0123456789abcdef',
};
const entraIssuerBaseUrl = vi.fn(() => 'http://sign-in.test');
vi.mock('./config', () => ({
  loadConfig: () => TEST_CONFIG,
  entraIssuerBaseUrl: () => entraIssuerBaseUrl(),
}));

const store = new Map<string, string>();
vi.mock('./redis', () => ({
  getRedisClient: () => ({
    get: async (key: string) => store.get(key) ?? null,
    setex: async (key: string, _ttl: number, value: string) => store.set(key, value),
    del: async (key: string) => store.delete(key),
  }),
  prefixedKey: (config: { redisKeyPrefix: string }, ...parts: string[]) => `${config.redisKeyPrefix}${parts.join(':')}`,
}));

const discovery = vi.fn(async () => ({ __fakeConfiguration: true }));
const allowInsecureRequests = vi.fn();
const authorizationCodeGrant = vi.fn(async () => ({
  access_token: 'access-token-value',
  refresh_token: 'refresh-token-value',
  expires_in: 3600,
  claims: () => ({
    name: 'Mai Nguyen',
    preferred_username: 'mai@drunkcoding.net',
    oid: '11111111-1111-4111-8111-111111111111',
    tenant_name: 'Drunk Coding',
  }),
}));
vi.mock('openid-client', () => ({
  discovery,
  allowInsecureRequests,
  randomState: () => 'state-value',
  randomNonce: () => 'nonce-value',
  randomPKCECodeVerifier: () => 'verifier-value',
  calculatePKCECodeChallenge: async (v: string) => `challenge-of-${v}`,
  buildAuthorizationUrl: (_config: unknown, params: Record<string, string>) =>
    new URL(`http://sign-in.test/drunk-coding-tenant/authorize?${new URLSearchParams(params).toString()}`),
  authorizationCodeGrant,
}));

const { beginSignIn, completeSignIn, scopesFromAccessToken } = await import('./oidc');

beforeEach(() => {
  store.clear();
  authorizationCodeGrant.mockClear();
  discovery.mockClear();
  allowInsecureRequests.mockClear();
  entraIssuerBaseUrl.mockReturnValue('http://sign-in.test');
});

function fakeJwt(payload: Record<string, unknown>): string {
  const part = (obj: Record<string, unknown>): string => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part(payload)}.signature`;
}

describe('scopesFromAccessToken', () => {
  it('reads space-separated scopes from the scp claim', () => {
    expect(scopesFromAccessToken(fakeJwt({ scp: 'accounts.read postings.read' }))).toEqual(['accounts.read', 'postings.read']);
  });

  it('is empty when scp is absent', () => {
    expect(scopesFromAccessToken(fakeJwt({ oid: 'x' }))).toEqual([]);
  });

  it('is empty (never throws) for an opaque, non-JWT access token', () => {
    expect(scopesFromAccessToken('MAI-CANARY-ACCESS-TOKEN-NOT-A-JWT')).toEqual([]);
  });
});

describe('beginSignIn', () => {
  it('records state/nonce/codeVerifier under the console prefix and returns the authorize URL', async () => {
    const { redirectUrl, state } = await beginSignIn();
    const url = new URL(redirectUrl);
    expect(url.pathname).toBe('/drunk-coding-tenant/authorize');
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('nonce')).toBe('nonce-value');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-of-verifier-value');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe('http://console.test/signin/callback');
    expect(url.searchParams.get('scope')).toBe('openid profile email accounts.read postings.read postings.reverse');
    expect(state).toEqual({ state: 'state-value', nonce: 'nonce-value', codeVerifier: 'verifier-value', returnTo: '/' });
    expect(JSON.parse(store.get('console:signin:state-value')!)).toEqual(state);
  });

  it('allows insecure requests for the fake (http) issuer the acceptance suite points at', async () => {
    await beginSignIn();
    expect(discovery).toHaveBeenCalledWith(
      new URL('http://sign-in.test/drunk-coding-tenant'),
      TEST_CONFIG.entraClientId,
      TEST_CONFIG.entraClientSecret,
      undefined,
      { execute: [allowInsecureRequests] },
    );
  });

  it('does not relax HTTPS for a real (https) issuer', async () => {
    entraIssuerBaseUrl.mockReturnValue('https://login.microsoftonline.com');
    await beginSignIn();
    expect(discovery).toHaveBeenCalledWith(
      new URL('https://login.microsoftonline.com/drunk-coding-tenant/v2.0'),
      TEST_CONFIG.entraClientId,
      TEST_CONFIG.entraClientSecret,
      undefined,
      undefined,
    );
  });

  it('never relaxes HTTPS in production, even for a misconfigured http issuer', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      await beginSignIn();
      expect(discovery).toHaveBeenCalledWith(
        new URL('http://sign-in.test/drunk-coding-tenant'),
        TEST_CONFIG.entraClientId,
        TEST_CONFIG.entraClientSecret,
        undefined,
        undefined,
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('resolves a same-origin returnTo, keeping only the path and query (R5)', async () => {
    const { state } = await beginSignIn('/groups?tab=archived');
    expect(state.returnTo).toBe('/groups?tab=archived');
  });

  it('discards a returnTo pointing at another origin, defaulting to "/" (R5)', async () => {
    const { state } = await beginSignIn('https://not-the-console.example.com/steal');
    expect(state.returnTo).toBe('/');
  });
});

describe('completeSignIn', () => {
  it('refuses an answer whose state has no server-side record (R4)', async () => {
    await expect(completeSignIn({ code: 'forged-code', state: 'never-issued-state' })).rejects.toThrow(/refused/i);
  });

  it('consumes state exactly once — a replay is refused (R4)', async () => {
    const { state } = await beginSignIn();
    await completeSignIn({ code: 'the-code', state: state.state });
    expect(store.has('console:signin:state-value')).toBe(false);
    await expect(completeSignIn({ code: 'the-code', state: state.state })).rejects.toThrow(/refused/i);
  });

  it('returns the session, tokens and the sign-in\'s own returnTo', async () => {
    const { state } = await beginSignIn('/accounts');
    const result = await completeSignIn({ code: 'the-code', state: state.state });

    expect(result).toEqual({
      session: {
        displayName: 'Mai Nguyen',
        signInName: 'mai@drunkcoding.net',
        directoryObjectId: '11111111-1111-4111-8111-111111111111',
        tenantName: 'Drunk Coding',
        expiresAt: expect.any(Number),
      },
      accessToken: 'access-token-value',
      refreshToken: 'refresh-token-value',
      returnTo: '/accounts',
    });
    const callbackUrl = (authorizationCodeGrant.mock.calls[0] as unknown as [unknown, URL, unknown])[1];
    expect(callbackUrl.pathname).toBe('/signin/callback');
    expect(callbackUrl.searchParams.get('code')).toBe('the-code');
    expect(callbackUrl.searchParams.get('state')).toBe(state.state);
    expect(authorizationCodeGrant).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(URL),
      expect.objectContaining({ expectedState: state.state, expectedNonce: 'nonce-value', pkceCodeVerifier: 'verifier-value' }),
    );
  });

  it('refuses when the token response carries no ID token claims', async () => {
    authorizationCodeGrant.mockResolvedValueOnce({
      access_token: 'access-token-value',
      expires_in: 3600,
      claims: () => undefined,
    } as never);
    const { state } = await beginSignIn();
    await expect(completeSignIn({ code: 'the-code', state: state.state })).rejects.toThrow(/no id token claims/i);
  });

  it('falls back to sub/oid and defaults expiresIn to 3600s when the token omits them', async () => {
    authorizationCodeGrant.mockResolvedValueOnce({
      access_token: 'access-token-value',
      claims: () => ({ sub: 'subject-only' }),
    } as never);
    const before = Math.floor(Date.now() / 1000);
    const { state } = await beginSignIn();
    const result = await completeSignIn({ code: 'the-code', state: state.state });

    expect(result.session.displayName).toBe('subject-only');
    expect(result.session.signInName).toBe('');
    expect(result.session.directoryObjectId).toBe('subject-only');
    expect(result.session.tenantName).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
    expect(result.session.expiresAt).toBeGreaterThanOrEqual(before + 3600);
    expect(result.session.expiresAt).toBeLessThan(before + 3601);
  });
});
