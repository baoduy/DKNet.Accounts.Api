/**
 * A minimal, tenant-scoped OIDC issuer standing in for Microsoft Entra ID. Real Entra ID
 * is unreachable from CI (DRK-1669 §7 slice notes), so every sign-in scenario in the
 * acceptance suite drives this instead, pointed at by `CONSOLE_ENTRA_ISSUER_BASE_URL`.
 *
 * Endpoints, tenant-scoped like Entra ID's own `/{tenant}/...` shape:
 *   GET  /:tenant/.well-known/openid-configuration
 *   GET  /:tenant/authorize   — renders a sign-in form (never auto-completes: the test
 *                                drives it, the same way a real operator would)
 *   POST /:tenant/authorize   — issues a single-use code, redirects to redirect_uri
 *   POST /:tenant/token       — PKCE (S256) verified, issues access_token/id_token
 *   GET  /:tenant/jwks
 *
 * The end-to-end check (`docker-compose.e2e.yml`) runs it as a service of its own stack and
 * sets, beside the port:
 *   FAKE_OIDC_PUBLIC_BASE_URL       — the address every issuer and endpoint names, the same for
 *                                     the browser and the containers, whatever address a request
 *                                     arrived on (default: the address it arrived on)
 *   FAKE_OIDC_ACCESS_TOKEN_AUDIENCE — access tokens carry this `aud`, and the console's client id
 *                                     as `azp`, the way Entra ID's v2.0 tokens for an API do
 *                                     (default: neither — the acceptance suite's fake ledger reads
 *                                     scopes only)
 *   FAKE_OIDC_TLS_CERT / _KEY       — PEM files: serve HTTPS instead of HTTP (default: HTTP)
 *
 * A `POST /authorize` may include a hidden `accessTokenOverride` field: the acceptance
 * scenario that proves a cached token is unreadable needs to know the literal plaintext
 * it must NOT find in Redis, and browsers never see the access token (R3), so the test
 * fixes the literal here instead of reading it back from anywhere.
 */
import fs from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createServer as createTlsServer } from 'node:https';
import { randomBytes, randomUUID } from 'node:crypto';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';

// The run's own port, always passed in by `playwright.config.ts` (DRK-1726 R1) — never a default.
const PORT = Number(process.env.FAKE_OIDC_PORT);
if (!Number.isInteger(PORT) || PORT <= 0) throw new Error('FAKE_OIDC_PORT is not set to a port');
const PUBLIC_BASE_URL = process.env.FAKE_OIDC_PUBLIC_BASE_URL?.replace(/\/$/, '');
const ACCESS_TOKEN_AUDIENCE = process.env.FAKE_OIDC_ACCESS_TOKEN_AUDIENCE;
const TLS =
  process.env.FAKE_OIDC_TLS_CERT && process.env.FAKE_OIDC_TLS_KEY
    ? { cert: fs.readFileSync(process.env.FAKE_OIDC_TLS_CERT), key: fs.readFileSync(process.env.FAKE_OIDC_TLS_KEY) }
    : undefined;

const FIXTURE_USERS: Record<string, { name: string; objectId: string; tenantName: string; scopes: string[] }> = {
  // DRK-1696 §3 row 11: `MAI`, `MAI_MISSING_REVERSE_SCOPE` and `MAI_WITH_WRITE` are three
  // distinct scope grants for the same operator — each needs its own address, or whichever
  // grant lands last here wins for every scenario driving `mai@drunkcoding.net` (DRK-1696 §7
  // AT notes: this collided with spec 62's identity, which needs the reverse scope absent).
  'mai@drunkcoding.net': {
    name: 'Mai Nguyen',
    objectId: '11111111-1111-4111-8111-111111111111',
    tenantName: 'Drunk Coding',
    scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.reverse'],
  },
  'mai-partial@drunkcoding.net': {
    name: 'Mai Nguyen',
    objectId: '11111111-1111-4111-8111-111111111111',
    tenantName: 'Drunk Coding',
    scopes: ['accounts.read', 'postings.read'],
  },
  'mai-write@drunkcoding.net': {
    name: 'Mai Nguyen',
    objectId: '11111111-1111-4111-8111-111111111111',
    tenantName: 'Drunk Coding',
    scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write', 'postings.reverse'],
  },
  'nam@drunkcoding.net': {
    name: 'Nam Tran',
    objectId: '22222222-2222-4222-8222-222222222222',
    tenantName: 'Drunk Coding',
    scopes: ['accounts.read'],
  },
  // DRK-1727: Nam before he lost the postings read permission (same object id), and Lan, who
  // reads accounts and postings and may change nothing.
  'nam-postings@drunkcoding.net': {
    name: 'Nam Tran',
    objectId: '22222222-2222-4222-8222-222222222222',
    tenantName: 'Drunk Coding',
    scopes: ['accounts.read', 'postings.read'],
  },
  'lan@drunkcoding.net': {
    name: 'Lan Pham',
    objectId: '33333333-3333-4333-8333-333333333333',
    tenantName: 'Drunk Coding',
    scopes: ['accounts.read', 'postings.read'],
  },
};

interface PendingCode {
  email: string;
  tenant: string;
  redirectUri: string;
  nonce: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  accessTokenOverride?: string;
  expiresInOverride?: number;
  used: boolean;
  createdAt: number;
}

const pendingCodes = new Map<string, PendingCode>();
const { publicKey, privateKey } = await generateKeyPair('RS256');
const KEY_ID = 'fake-oidc-key-1';

function html(body: string): Response {
  return new Response(`<!doctype html><html><body>${body}</body></html>`, {
    headers: { 'content-type': 'text/html' },
  });
}

async function base64UrlSha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(digest).toString('base64url');
}

/** The issuer of `tenant`: the public address when one is set, else the one the request arrived on. */
function issuerOf(url: URL, tenant: string): string {
  return `${PUBLIC_BASE_URL ?? `${url.protocol}//${url.host}`}/${tenant}`;
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments.length >= 1 && segments[segments.length - 1] === 'jwks') {
    const jwk = await exportJWK(publicKey);
    return Response.json({ keys: [{ ...jwk, kid: KEY_ID, use: 'sig', alg: 'RS256' }] });
  }

  if (segments.length >= 1 && segments.at(-1) === 'openid-configuration') {
    const base = issuerOf(url, segments[0]);
    return Response.json({
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      jwks_uri: `${base}/jwks`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    });
  }

  if (segments.length === 2 && segments[1] === 'authorize') {
    const tenant = segments[0];

    if (request.method === 'GET') {
      const clientId = url.searchParams.get('client_id') ?? '';
      const redirectUri = url.searchParams.get('redirect_uri') ?? '';
      const state = url.searchParams.get('state') ?? '';
      const nonce = url.searchParams.get('nonce') ?? '';
      const codeChallenge = url.searchParams.get('code_challenge') ?? '';
      const codeChallengeMethod = url.searchParams.get('code_challenge_method') ?? '';
      return html(`
        <form method="post" action="/${tenant}/authorize" data-testid="fake-idp-signin-form">
          <input type="hidden" name="client_id" value="${clientId}" />
          <input type="hidden" name="redirect_uri" value="${redirectUri}" />
          <input type="hidden" name="state" value="${state}" />
          <input type="hidden" name="nonce" value="${nonce}" />
          <input type="hidden" name="code_challenge" value="${codeChallenge}" />
          <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}" />
          <label>Email <input name="email" type="email" /></label>
          <input name="accessTokenOverride" type="hidden" value="" />
          <input name="expiresInOverride" type="hidden" value="" />
          <button type="submit">Sign in</button>
        </form>
      `);
    }

    if (request.method === 'POST') {
      const form = await request.formData();
      const email = String(form.get('email') ?? '');
      const redirectUri = String(form.get('redirect_uri') ?? '');
      const state = String(form.get('state') ?? '');
      const nonce = String(form.get('nonce') ?? '');
      const codeChallenge = String(form.get('code_challenge') ?? '') || undefined;
      const codeChallengeMethod = String(form.get('code_challenge_method') ?? '') || undefined;
      const accessTokenOverride = String(form.get('accessTokenOverride') ?? '') || undefined;
      const expiresInOverrideRaw = String(form.get('expiresInOverride') ?? '') || undefined;
      const expiresInOverride = expiresInOverrideRaw ? Number(expiresInOverrideRaw) : undefined;

      if (!FIXTURE_USERS[email]) {
        return new Response('unknown fixture user', { status: 401 });
      }

      const code = randomBytes(24).toString('base64url');
      pendingCodes.set(code, {
        email,
        tenant,
        redirectUri,
        nonce,
        codeChallenge,
        codeChallengeMethod,
        accessTokenOverride,
        expiresInOverride,
        used: false,
        createdAt: Date.now(),
      });

      const redirect = new URL(redirectUri);
      redirect.searchParams.set('code', code);
      redirect.searchParams.set('state', state);
      return Response.redirect(redirect.toString(), 302);
    }
  }

  if (segments.length === 2 && segments[1] === 'token' && request.method === 'POST') {
    const tenant = segments[0];
    const form = await request.formData();
    const code = String(form.get('code') ?? '');
    const codeVerifier = String(form.get('code_verifier') ?? '');
    const pending = pendingCodes.get(code);

    if (!pending || pending.used || pending.tenant !== tenant) {
      return Response.json({ error: 'invalid_grant' }, { status: 400 });
    }
    if (pending.codeChallenge) {
      const computed = await base64UrlSha256(codeVerifier);
      if (computed !== pending.codeChallenge) {
        return Response.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400 });
      }
    }
    pending.used = true;

    const user = FIXTURE_USERS[pending.email];
    const expiresIn = pending.expiresInOverride ?? 3600;
    const base = issuerOf(url, tenant);

    const idToken = await new SignJWT({
      name: user.name,
      preferred_username: pending.email,
      oid: user.objectId,
      tid: tenant,
      tenant_name: user.tenantName,
      nonce: pending.nonce,
    })
      .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
      .setIssuer(base)
      .setAudience(CLIENT_ID_FROM_ENV())
      .setSubject(user.objectId)
      .setIssuedAt()
      .setExpirationTime(`${expiresIn}s`)
      .sign(privateKey);

    let accessTokenJwt = new SignJWT({
      scp: user.scopes.join(' '),
      oid: user.objectId,
      tid: tenant,
      ...(ACCESS_TOKEN_AUDIENCE ? { azp: CLIENT_ID_FROM_ENV() } : {}),
    })
      .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
      .setIssuer(base)
      .setSubject(user.objectId)
      .setIssuedAt()
      .setExpirationTime(`${expiresIn}s`);
    if (ACCESS_TOKEN_AUDIENCE) accessTokenJwt = accessTokenJwt.setAudience(ACCESS_TOKEN_AUDIENCE);
    const accessToken = pending.accessTokenOverride ?? (await accessTokenJwt.sign(privateKey));

    return Response.json({
      token_type: 'Bearer',
      access_token: accessToken,
      id_token: idToken,
      refresh_token: randomUUID(),
      expires_in: expiresIn,
    });
  }

  return new Response('not found', { status: 404 });
}

function CLIENT_ID_FROM_ENV(): string {
  return process.env.CONSOLE_ENTRA_CLIENT_ID ?? 'console-test-client';
}

function serve(req: IncomingMessage, res: ServerResponse): void {
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const body = Buffer.concat(chunks);
    const request = new Request(`${TLS ? 'https' : 'http'}://127.0.0.1:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : body,
    });
    try {
      const response = await handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(error));
    }
  });
}

const server = TLS ? createTlsServer(TLS, serve) : createServer(serve);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`fake-oidc-issuer listening on ${PORT}`);
});
