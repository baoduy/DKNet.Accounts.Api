/**
 * DRK-1725 §3 "The end-to-end check" — starts this run's own stack and publishes it to the
 * checks, and removes it when the run ends (contract: `stack.ts`).
 *
 * The stack is `docker-compose.yml` plus the test-only `docker-compose.e2e.yml`, built from this
 * checkout, under the project `dknet-e2e-<run id>` on free ports, with empty volumes. The run
 * touches nothing but that project (brief DRK-1732 R1): every container, volume and network is
 * found by its name, and the two images it builds carry the run id in their tag.
 *
 * It is removed (`down -v`, and its two images) when the run ends however it ends (R2): the
 * returned teardown on pass or fail, the setup's own catch when the stack never came up, and a
 * handler for SIGINT (Ctrl+C, Playwright then runs the teardown too), SIGTERM and SIGHUP that
 * stops a `compose up` still in flight and removes the stack before the process goes.
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UI_ROOT, freePorts } from '../../support/run';
import { E2E_PROJECT_PREFIX, E2E_RUN_ID_ENV, E2E_STACK_ENV, type E2eStack } from './stack';

const REPO_ROOT = path.resolve(UI_ROOT, '..');
const COMPOSE_FILES = ['-f', 'docker-compose.yml', '-f', 'docker-compose.e2e.yml'];
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
const WAIT_TIMEOUT_SECONDS = '600';

/**
 * A per-run CA and the stand-in's certificate for `fake-oidc`, signed by it. The console image
 * runs with NODE_ENV=production and refuses a plain-HTTP issuer (`lib/oidc.ts`), so the stand-in
 * serves HTTPS; only this stack's containers are told to trust the CA.
 */
function writeTls(dir: string): void {
  const openssl = (args: string[]): void => void execFileSync('openssl', args, { cwd: dir, stdio: 'ignore' });
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=dknet e2e run CA', '-keyout', 'ca-key.pem', '-out', 'ca.pem']);
  openssl(['req', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=fake-oidc', '-keyout', 'fake-oidc-key.pem', '-out', 'fake-oidc.csr']);
  fs.writeFileSync(path.join(dir, 'fake-oidc.ext'), 'subjectAltName=DNS:fake-oidc\nextendedKeyUsage=serverAuth\n');
  openssl(['x509', '-req', '-in', 'fake-oidc.csr', '-CA', 'ca.pem', '-CAkey', 'ca-key.pem', '-CAcreateserial', '-days', '1', '-extfile', 'fake-oidc.ext', '-out', 'fake-oidc.pem']);
  // The service and the console run as their images' own users; the folder is theirs to read.
  fs.chmodSync(dir, 0o755);
  for (const file of fs.readdirSync(dir)) fs.chmodSync(path.join(dir, file), 0o644);
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  const runId = process.env[E2E_RUN_ID_ENV] || randomUUID().slice(0, 8);
  const project = `${E2E_PROJECT_PREFIX}${runId}`;
  const [apiPort, consolePort, signInPort] = freePorts(3);
  const consoleBaseUrl = `http://127.0.0.1:${consolePort}`;
  const tlsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dknet-e2e-tls-'));

  // Set here, not read from the shell or a checkout's `.env`: the process environment wins over
  // `.env` for everything compose substitutes.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    COMPOSE_PROFILES: 'api,console',
    API_IMAGE: '',
    CONSOLE_IMAGE: '',
    CONSOLE_API_ADDRESS: '',
    API_PORT: String(apiPort),
    CONSOLE_PORT: String(consolePort),
    [E2E_RUN_ID_ENV]: runId,
    CONSOLE_E2E_OIDC_PORT: String(signInPort),
    CONSOLE_E2E_TLS_DIR: tlsDir,
    CONSOLE_E2E_CONSOLE_BASE_URL: consoleBaseUrl,
  };
  const compose = ['compose', '-p', project, ...COMPOSE_FILES];

  let up: ChildProcess | undefined;
  let removed = false;
  const removeStack = (): void => {
    if (removed) return;
    removed = true;
    for (const signal of SIGNALS) process.off(signal, onSignal);
    process.off('exit', removeStack);
    up?.kill('SIGKILL');
    try {
      execFileSync('docker', [...compose, 'down', '-v', '--remove-orphans', '--timeout', '5'], { cwd: REPO_ROOT, env, stdio: 'ignore' });
      execFileSync('docker', ['image', 'rm', '-f', `dknet-accounts-api:e2e-${runId}`, `dknet-accounts-console:e2e-${runId}`], { stdio: 'ignore' });
    } finally {
      fs.rmSync(tlsDir, { recursive: true, force: true });
    }
  };
  function onSignal(signal: NodeJS.Signals): void {
    removeStack();
    // Playwright ends a run on SIGINT itself; nothing else would end it on SIGTERM or SIGHUP.
    if (process.listenerCount(signal) === 0) process.exit(128 + os.constants.signals[signal]);
  }
  for (const signal of SIGNALS) process.on(signal, onSignal);
  process.on('exit', removeStack);

  try {
    writeTls(tlsDir);
    up = spawn('docker', [...compose, 'up', '--build', '--wait', '--wait-timeout', WAIT_TIMEOUT_SECONDS], { cwd: REPO_ROOT, env, stdio: 'inherit' });
    const code = await new Promise<number | null>((resolve, reject) => {
      up!.on('error', reject);
      up!.on('close', resolve);
    });
    up = undefined;
    if (code !== 0) throw new Error(`docker compose up for ${project} exited ${code}`);
  } catch (error) {
    removeStack();
    throw error;
  }

  const stack: E2eStack = { project, consoleBaseUrl };
  process.env[E2E_STACK_ENV] = JSON.stringify(stack);
  return async () => removeStack();
}
