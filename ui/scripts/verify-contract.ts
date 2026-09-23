/**
 * DRK-1684 §3 row 3 — regenerates the OpenAPI document from the live/served ledger service
 * and fails when the committed `contract/openapi.json` no longer matches it, naming the
 * drift. Wired into CI ahead of `typecheck` (`.github/workflows/build.yml`).
 *
 * DRK-1679 §9 Q1: in CI this builds and briefly runs the API project (`dotnet`, set up in
 * `console-build-test` alongside the existing `build-test` job) and reads its own published
 * document at `/openapi/v1.json` — no database, no `ApiEndpoints/**` change.
 * `LEDGER_OPENAPI_SOURCE_FILE`, when set, reads the live document from that file instead —
 * the seam `40-build-fails-when-contract-out-of-date.spec.ts` uses so the acceptance suite
 * never needs a `dotnet` build in its own loop.
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UI_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const REPO_ROOT = path.resolve(UI_ROOT, '..');
const CONTRACT_PATH = path.join(UI_ROOT, 'contract', 'openapi.json');
const API_PROJECT_DIR = path.join(REPO_ROOT, 'ApiEndpoints', 'DKNet.Accounts.Api');
const API_PROJECT = path.join(API_PROJECT_DIR, 'DKNet.Accounts.Api.csproj');
const LIVE_PORT = 58080;

interface OpenApiDoc {
  paths: Record<string, unknown>;
}

function readCommitted(): OpenApiDoc {
  return JSON.parse(readFileSync(CONTRACT_PATH, 'utf8')) as OpenApiDoc;
}

/** Every path the live document publishes, with its `/v1` version segment stripped — the
 * committed contract factors that into `servers[0].url` instead (row 1). */
function stripVersionPrefix(paths: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(paths)) {
    result[key.replace(/^\/v\d+/, '')] = value;
  }
  return result;
}

async function pollForDocument(url: string, attempts = 30): Promise<string> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.text();
    } catch {
      // The API is not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for the live OpenAPI document at ${url}`);
}

/** Builds and briefly runs the API project, stripped down to no database and no auth, purely
 * to read the OpenAPI document its own `MapOpenApi()` (`SwaggerConfig.cs`) publishes. */
async function fetchLiveDocumentFromApiProject(): Promise<OpenApiDoc> {
  execFileSync('dotnet', ['build', API_PROJECT, '-c', 'Release'], { stdio: 'inherit' });
  const dll = path.join(API_PROJECT_DIR, 'bin', 'Release', 'net10.0', 'DKNet.Accounts.Api.dll');

  const child = spawn('dotnet', ['exec', dll], {
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: 'Production',
      ASPNETCORE_URLS: `http://127.0.0.1:${LIVE_PORT}`,
      FeatureManagement__EnableSwagger: 'true',
      FeatureManagement__RequireAuthorization: 'false',
      FeatureManagement__RunDbMigrationWhenAppStart: 'false',
      FeatureManagement__EnableHttps: 'false',
      FeatureManagement__EnableAzureAppConfig: 'false',
      FeatureManagement__EnableServiceBus: 'false',
      FeatureManagement__EnableHealthCheck: 'false',
      FeatureManagement__EnableOpenTelemetry: 'false',
      FeatureManagement__EnableRateLimit: 'false',
      FeatureManagement__EnableForwardedHeaders: 'false',
      FeatureManagement__EnableRequestBounds: 'false',
      FeatureManagement__EnableSecurityHeaders: 'false',
      ConnectionStrings__AppDb: '',
    },
    stdio: 'ignore',
  });

  try {
    const raw = await pollForDocument(`http://127.0.0.1:${LIVE_PORT}/openapi/v1.json`);
    const live = JSON.parse(raw) as OpenApiDoc;
    return { paths: stripVersionPrefix(live.paths) };
  } finally {
    child.kill();
  }
}

async function readLiveDocument(): Promise<OpenApiDoc> {
  const sourceFile = process.env.LEDGER_OPENAPI_SOURCE_FILE;
  if (sourceFile) {
    return JSON.parse(readFileSync(sourceFile, 'utf8')) as OpenApiDoc;
  }
  return fetchLiveDocumentFromApiProject();
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

/**
 * `method path` for every operation a document declares. The committed contract is a
 * curated subset of the service's full surface (only what §3a's pass-through forwards) —
 * the live document naturally declares many more operations the console never touches, so
 * drift is only ever "something we depend on disappeared," never "the live service also
 * has other things."
 */
function collectOperations(doc: OpenApiDoc): Set<string> {
  const operations = new Set<string>();
  for (const [route, item] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      if ((item as Record<string, unknown>)[method]) operations.add(`${method.toUpperCase()} ${route}`);
    }
  }
  return operations;
}

function diffPaths(committed: OpenApiDoc, live: OpenApiDoc): string[] {
  const liveOperations = collectOperations(live);
  const drifts: string[] = [];
  for (const operation of collectOperations(committed)) {
    if (!liveOperations.has(operation)) {
      drifts.push(`${operation} is in the committed contract, but the live service no longer declares it.`);
    }
  }
  return drifts;
}

async function verifyContract(): Promise<void> {
  const committed = readCommitted();
  const live = await readLiveDocument();
  const drifts = diffPaths(committed, live);
  if (drifts.length > 0) {
    throw new Error(
      [
        "contract/openapi.json is out of date with the live ledger service — run 'pnpm run generate:api-schema' against a fresh document and commit the result:",
        ...drifts,
      ].join('\n'),
    );
  }
  // eslint-disable-next-line no-console
  console.log('contract/openapi.json matches the live ledger service.');
}

verifyContract().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
