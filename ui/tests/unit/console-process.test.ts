/**
 * DRK-1688 — the console acceptance harness must own the process it starts.
 *
 * These scenarios drive the real `startConsole`/`stopConsole` (a real `next dev` on scratch
 * ports), not a mock of them — the defect is in what those functions do to an OS-level port,
 * which a mock cannot reproduce. Scratch ports 3301-3303 are chosen outside the ranges already
 * claimed by the shared webServer (3100) and specs 08/15/16/17 (3200-3205), and outside the
 * fake OIDC/Redis fixture ports (4488, 16532) reused below as shared infrastructure.
 */
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { type ConsoleHandle, startConsole, stopConsole } from '../support/console-process';
import { FAKE_OIDC_PORT, FAKE_REDIS_PORT, TENANT_DRUNK_CODING, TENANT_OTHER_DIRECTORY, defaultConsoleEnv } from '../support/fixtures';

const UI_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPortOpen(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await isPortOpen(port))) {
    if (Date.now() > deadline) {
      throw new Error(`nothing answered on ${port} within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Kills whatever OS process holds a scratch port, by port rather than by the handle this
 * test happened to spawn — `stopConsole`'s own process-tree bug (the thing under test) means
 * a handle-based kill can leave a real `next-server` child listening after the test ends,
 * which would otherwise poison every later test and leak a process past this run.
 */
function forceFreePort(port: number): void {
  try {
    execFileSync('fuser', ['-k', '-9', `${port}/tcp`], { stdio: 'ignore' });
  } catch {
    // fuser exits non-zero when nothing was listening on the port — nothing to clean up.
  }
}

/** Reuses the shared fake Redis container the acceptance suite also targets — starts it only if absent. */
async function ensureFakeRedisRunning(): Promise<void> {
  if (await isPortOpen(FAKE_REDIS_PORT)) return;
  spawn('docker', ['run', '--rm', '-p', `${FAKE_REDIS_PORT}:6379`, '--name', 'drk1673-fake-redis', 'redis:8-alpine'], {
    stdio: 'ignore',
    detached: true,
  }).unref();
  await waitForPortOpen(FAKE_REDIS_PORT, 30_000);
}

let fakeOidcChild: ChildProcess | undefined;

/** Reuses a fake OIDC issuer already listening (e.g. from the acceptance suite) — starts one only if absent. */
async function ensureFakeOidcRunning(): Promise<void> {
  if (await isPortOpen(FAKE_OIDC_PORT)) return;
  fakeOidcChild = spawn('pnpm', ['exec', 'tsx', 'tests/fakes/fake-oidc-issuer.ts'], {
    cwd: UI_ROOT,
    env: { ...process.env, FAKE_OIDC_PORT: String(FAKE_OIDC_PORT) },
    stdio: 'ignore',
  });
  await waitForPortOpen(FAKE_OIDC_PORT, 30_000);
}

beforeAll(async () => {
  await ensureFakeRedisRunning();
  await ensureFakeOidcRunning();
}, 60_000);

afterAll(() => {
  fakeOidcChild?.kill('SIGKILL');
  forceFreePort(FAKE_OIDC_PORT);
});

const SCRATCH_PORTS = [3301, 3302, 3303];

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

let activeHandles: ConsoleHandle[] = [];
let activeServers: net.Server[] = [];

afterEach(async () => {
  for (const handle of activeHandles) {
    if (!handle.process.killed) handle.process.kill('SIGKILL');
  }
  // In-process listeners (the scenario's own `net.createServer()`) must be fully closed
  // BEFORE forceFreePort runs below — otherwise `fuser -k` finds this very worker process
  // still holding the port and kills it too, not just the spawned `next dev` child.
  await Promise.all(activeServers.map(closeServer));
  activeHandles = [];
  activeServers = [];
  for (const port of SCRATCH_PORTS) forceFreePort(port);
});

describe('console restart harness', () => {
  test('Stopping a console frees its port', async () => {
    const PORT = 3301;

    const handle = await startConsole(defaultConsoleEnv(PORT), PORT);
    activeHandles.push(handle);

    await stopConsole(handle);

    const probe = net.createServer();
    try {
      await new Promise<void>((resolve, reject) => {
        probe.once('error', reject);
        probe.listen(PORT, '127.0.0.1', () => resolve());
      });
    } finally {
      probe.close();
    }
  }, 90_000);

  test('The harness refuses a port it does not own', async () => {
    const PORT = 3302;

    const foreign = net.createServer();
    activeServers.push(foreign);
    await new Promise<void>((resolve, reject) => {
      foreign.once('error', reject);
      foreign.listen(PORT, '127.0.0.1', () => resolve());
    });

    let thrown: unknown;
    let handle: ConsoleHandle | undefined;
    try {
      handle = await startConsole(defaultConsoleEnv(PORT), PORT);
    } catch (error) {
      thrown = error;
    } finally {
      if (handle) activeHandles.push(handle);
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error | undefined)?.message).toContain(String(PORT));
    expect(handle).toBeUndefined();
  }, 40_000);

  test('A replacement console serves its own directory', async () => {
    const PORT = 3303;
    const BASE = `http://127.0.0.1:${PORT}`;

    let handle = await startConsole(defaultConsoleEnv(PORT), PORT);
    activeHandles.push(handle);

    let response = await fetch(`${BASE}/signin`);
    expect(response.url).toContain(TENANT_DRUNK_CODING);

    await stopConsole(handle);
    activeHandles = activeHandles.filter((h) => h !== handle);

    handle = await startConsole({ ...defaultConsoleEnv(PORT), CONSOLE_ENTRA_TENANT_ID: TENANT_OTHER_DIRECTORY }, PORT);
    activeHandles.push(handle);

    response = await fetch(`${BASE}/signin`);
    expect(response.url).toContain(TENANT_OTHER_DIRECTORY);
    expect(response.url).not.toContain(TENANT_DRUNK_CODING);
  }, 150_000);
});
