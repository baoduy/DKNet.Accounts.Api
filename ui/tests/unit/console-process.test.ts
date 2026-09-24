/**
 * DRK-1688 — the console acceptance harness must own the process it starts.
 *
 * These scenarios drive the real `startConsole`/`stopConsole` (a real `next dev` on scratch
 * ports), not a mock of them — the defect is in what those functions do to an OS-level port,
 * which a mock cannot reproduce. Every port, the cache container and the sign-in server here
 * are this file's own (DRK-1726 R1): nothing is adopted from, or stopped for, another run (R2).
 */
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { type ConsoleHandle, startConsole, stopConsole } from '../support/console-process';
import { FAKE_OIDC_PORT, FAKE_REDIS_CONTAINER, FAKE_REDIS_PORT, TENANT_DRUNK_CODING, TENANT_OTHER_DIRECTORY, defaultConsoleEnv } from '../support/fixtures';
import { UI_ROOT, currentRun, freePorts, restoreCheckout } from '../support/run';

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

async function waitForPortFree(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (await isPortOpen(port)) {
    if (Date.now() > deadline) {
      throw new Error(`port ${port} still answered after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Kills the whole process group a console handle leads (`startConsole` spawns `next` detached)
 * — the handle this file started, never whatever holds a port: `stopConsole`'s own
 * process-tree bug (the thing under test) could otherwise leave a `next-server` child
 * listening past this run.
 */
function killConsoleGroup(handle: ConsoleHandle): void {
  if (handle.process.pid === undefined) return;
  try {
    process.kill(-handle.process.pid, 'SIGKILL');
  } catch {
    // ESRCH — the group already exited.
  }
}

const SCRATCH_PORTS = freePorts(4);
let fakeOidcChild: ChildProcess | undefined;

beforeAll(async () => {
  spawn('docker', ['run', '--rm', '-p', `127.0.0.1:${FAKE_REDIS_PORT}:6379`, '--name', FAKE_REDIS_CONTAINER, 'redis:8-alpine'], {
    stdio: 'ignore',
    detached: true,
  }).unref();
  fakeOidcChild = spawn('pnpm', ['exec', 'tsx', 'tests/fakes/fake-oidc-issuer.ts'], {
    cwd: UI_ROOT,
    env: { ...process.env, FAKE_OIDC_PORT: String(FAKE_OIDC_PORT) },
    stdio: 'ignore',
    detached: true,
  });
  await Promise.all([waitForPortOpen(FAKE_REDIS_PORT, 30_000), waitForPortOpen(FAKE_OIDC_PORT, 30_000)]);
}, 60_000);

afterAll(() => {
  if (fakeOidcChild?.pid !== undefined) process.kill(-fakeOidcChild.pid, 'SIGKILL');
  try {
    execFileSync('docker', ['rm', '-f', FAKE_REDIS_CONTAINER], { stdio: 'ignore' });
  } catch {
    // Already gone — `--rm` removed it when it stopped.
  }
  restoreCheckout(currentRun().tsconfig, SCRATCH_PORTS);
});

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

let activeHandles: ConsoleHandle[] = [];
let activeServers: net.Server[] = [];

afterEach(async () => {
  for (const handle of activeHandles) killConsoleGroup(handle);
  await Promise.all(activeServers.map(closeServer));
  activeHandles = [];
  activeServers = [];
});

describe('console restart harness', () => {
  test('A console does not outlive the worker that started it', async () => {
    // DRK-1734 B3: a check that runs out of time never reaches its own `stopConsole`. The
    // worker (here: a process that starts a console and exits without stopping it) must take
    // the console down with it, or the next check finds the port taken.
    const PORT = SCRATCH_PORTS[3];
    const script = path.join(UI_ROOT, 'tests', `tmp-exits-with-console-${PORT}.ts`);
    fs.writeFileSync(
      script,
      `import { startConsole } from './support/console-process';
import { defaultConsoleEnv } from './support/fixtures';
const handle = await startConsole(defaultConsoleEnv(${PORT}), ${PORT});
process.stdout.write(String(handle.process.pid));
process.exit(0);
`,
    );
    let consolePid: number | undefined;
    try {
      consolePid = Number(execFileSync(path.join(UI_ROOT, 'node_modules', '.bin', 'tsx'), [script], { cwd: UI_ROOT, encoding: 'utf8' }));
      expect(consolePid).toBeGreaterThan(0);
      await waitForPortFree(PORT, 10_000);
    } finally {
      fs.rmSync(script, { force: true });
      if (consolePid) {
        try {
          process.kill(-consolePid, 'SIGKILL');
        } catch {
          // ESRCH — gone, as it should be.
        }
      }
    }
  }, 90_000);

  test('Stopping a console frees its port', async () => {
    const PORT = SCRATCH_PORTS[0];

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
    const PORT = SCRATCH_PORTS[1];

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
    const PORT = SCRATCH_PORTS[2];
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
