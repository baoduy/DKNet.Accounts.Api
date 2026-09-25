import * as client from 'openid-client';
import { entraIssuerBaseUrl, loadConfig, type ConsoleConfig } from './config';
import { getRedisClient, prefixedKey } from './redis';
export { KNOWN_SCOPES, SCOPE_CONSEQUENCES } from './scopes';

const SIGN_IN_STATE_TTL_SECONDS = 600;

/**
 * Auth code + PKCE against Microsoft Entra ID (`openid-client`). `state`/`nonce`/
 * `code_verifier` are held server-side under the console's Redis prefix and each is
 * consumed exactly once (R4). Every post-sign-in redirect is resolved against
 * `CONSOLE_BASE_URL` only (R5).
 */
export interface SignInState {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

export interface SignInResult {
  session: {
    displayName: string;
    signInName: string;
    directoryObjectId: string;
    tenantName?: string;
    expiresAt: number;
  };
  accessToken: string;
  refreshToken?: string;
  returnTo: string;
}

function signInStateKey(config: ConsoleConfig, state: string): string {
  return prefixedKey(config, 'signin', state);
}

/** Resolves a candidate return path against `CONSOLE_BASE_URL` only (R5) — anything else is discarded. */
function resolveReturnTo(baseUrl: string, candidate: string | undefined): string {
  if (!candidate) return '/';
  try {
    const resolved = new URL(candidate, baseUrl);
    return resolved.origin === new URL(baseUrl).origin ? `${resolved.pathname}${resolved.search}` : '/';
  } catch {
    return '/';
  }
}

async function discover(config: ConsoleConfig): Promise<client.Configuration> {
  const issuerBase = entraIssuerBaseUrl();
  // Entra's bare `/{tenant}` metadata is the v1 endpoint, which ignores `scope` and answers the
  // callback with an error instead of a code; only `/{tenant}/v2.0` honours the requested scopes.
  const tenantPath = new URL(issuerBase).hostname === 'login.microsoftonline.com'
    ? `${config.entraTenantId}/v2.0`
    : config.entraTenantId;
  const issuerUrl = new URL(`${issuerBase.replace(/\/$/, '')}/${tenantPath}`);
  // The fake OIDC issuer standing in for Entra ID in tests runs over plain HTTP — never
  // relaxed in production, even if CONSOLE_ENTRA_ISSUER_BASE_URL were ever misconfigured.
  const insecure = issuerUrl.protocol === 'http:' && process.env.NODE_ENV !== 'production';
  return client.discovery(
    issuerUrl,
    config.entraClientId,
    config.entraClientSecret,
    undefined,
    insecure ? ({ execute: [client.allowInsecureRequests] } as client.DiscoveryRequestOptions) : undefined,
  );
}

/** Starts a sign-in: records `state` under the console's prefix, returns the redirect URL. */
export async function beginSignIn(returnTo?: string): Promise<{ redirectUrl: string; state: SignInState }> {
  const config = loadConfig();
  const oidcConfig = await discover(config);

  const state = client.randomState();
  const nonce = client.randomNonce();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const signInState: SignInState = { state, nonce, codeVerifier, returnTo: resolveReturnTo(config.baseUrl, returnTo) };

  const redirectUri = new URL('/signin/callback', config.baseUrl).toString();
  const authorizationUrl = client.buildAuthorizationUrl(oidcConfig, {
    redirect_uri: redirectUri,
    scope: ['openid', 'profile', 'email', ...config.entraScopes].join(' '),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const redis = getRedisClient();
  await redis.setex(signInStateKey(config, state), SIGN_IN_STATE_TTL_SECONDS, JSON.stringify(signInState));

  return { redirectUrl: authorizationUrl.toString(), state: signInState };
}

/**
 * Reads the JWT payload without verifying its signature — the token endpoint already handed
 * it to us over PKCE. Entra ID access tokens are JWTs in this API's configuration, but an
 * opaque (non-JWT) access token is a valid OAuth response too, so a token that doesn't
 * decode just carries no readable scopes, rather than refusing the whole sign-in over it.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1] ?? '';
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** The scopes an access token carries — read from its own `scp` claim, never cached elsewhere. */
export function scopesFromAccessToken(accessToken: string): string[] {
  return String(decodeJwtPayload(accessToken).scp ?? '')
    .split(' ')
    .filter(Boolean);
}

/**
 * Completes a sign-in from the callback's `code`/`state`. Refuses (throws) when `state`
 * has no server-side record, or has already been consumed (R4).
 */
export async function completeSignIn(params: { code: string; state: string }): Promise<SignInResult> {
  const config = loadConfig();
  const redis = getRedisClient();
  const key = signInStateKey(config, params.state);
  const raw = await redis.get(key);
  if (!raw) {
    throw new Error('Sign-in answer refused: state was not issued by this console, or has already been used');
  }
  await redis.del(key);
  const signInState = JSON.parse(raw) as SignInState;

  const oidcConfig = await discover(config);
  const callbackUrl = new URL(config.baseUrl);
  callbackUrl.pathname = '/signin/callback';
  callbackUrl.searchParams.set('code', params.code);
  callbackUrl.searchParams.set('state', params.state);

  const tokens = await client.authorizationCodeGrant(oidcConfig, callbackUrl, {
    expectedState: params.state,
    expectedNonce: signInState.nonce,
    pkceCodeVerifier: signInState.codeVerifier,
  });

  const claims = tokens.claims();
  if (!claims) {
    throw new Error('Sign-in answer refused: no ID token claims returned');
  }
  const expiresIn = tokens.expires_in ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  return {
    session: {
      displayName: String(claims.name ?? claims.preferred_username ?? claims.sub),
      signInName: String(claims.preferred_username ?? ''),
      directoryObjectId: String(claims.oid ?? claims.sub),
      tenantName: claims.tenant_name ? String(claims.tenant_name) : undefined,
      expiresAt,
    },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    returnTo: signInState.returnTo,
  };
}
