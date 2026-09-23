/**
 * Spawns a dedicated console process for scenarios that need to restart it, run it with
 * a different directory, or run it with a value missing — things the shared Playwright
 * `webServer` instance cannot do mid-test.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { connect } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UI_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

// `next dev` forks its own dist/server/lib/start-server.js worker (the process that actually
// holds the port) rather than exec'ing into it — so the port-holding process is always a
// grandchild of whatever spawns `next`. Spawning `pnpm exec next dev` added a THIRD layer
// (pnpm itself) on top of that, of uncertain signal-forwarding behaviour. Spawning the `next`
// binary directly removes that extra layer, and `detached: true` makes the spawned `next`
// process the leader of its own process group — since `fork()` puts its child in the parent's
// group by default, `process.kill(-pid, signal)` reaches next AND its start-server worker in
// one signal, regardless of whether next's own SIGTERM handler gets a chance to run first.
const NEXT_BIN = path.join(UI_ROOT, 'node_modules', '.bin', 'next');
const STOP_GRACE_MS = 5_000;

export interface ConsoleHandle {
  process: ChildProcess;
  stdout: string;
  stderr: string;
  port: number;
}

function isPortOccupied(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function waitForPort(port: number, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = (): void => {
      const socket = connect({ port, host: '127.0.0.1' }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`console did not start listening on ${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 300);
        }
      });
    };
    attempt();
  });
}

/** Mirror of `waitForPort` — resolves once a connect to `port` is refused. */
function waitForPortFree(port: number, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = (): void => {
      const socket = connect({ port, host: '127.0.0.1' }, () => {
        socket.end();
        if (Date.now() > deadline) {
          reject(new Error(`port ${port} is still in use after ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 300);
        }
      });
      socket.on('error', () => {
        socket.destroy();
        resolve();
      });
    };
    attempt();
  });
}

/** Signals the whole process group the console's `next` process leads — see NEXT_BIN comment. */
function killConsoleGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

function spawnNextDev(env: NodeJS.ProcessEnv, port: number): ChildProcess {
  return spawn(NEXT_BIN, ['dev', '-p', String(port)], {
    cwd: UI_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
}

/** Starts `next dev` on `env.PORT` and waits until the console it spawned is listening. */
export async function startConsole(env: NodeJS.ProcessEnv, port: number): Promise<ConsoleHandle> {
  if (await isPortOccupied(port)) {
    throw new Error(`cannot start console: port ${port} is already in use by another process`);
  }

  const child = spawnNextDev(env, port);
  const handle: ConsoleHandle = { process: child, stdout: '', stderr: '', port };
  child.stdout?.on('data', (chunk) => (handle.stdout += String(chunk)));
  child.stderr?.on('data', (chunk) => (handle.stderr += String(chunk)));

  const exitedEarly = new Promise<never>((_resolve, reject) => {
    child.once('exit', (code, signal) => {
      reject(new Error(`console for port ${port} exited before it started listening (code ${code}, signal ${signal})`));
    });
  });
  exitedEarly.catch(() => {}); // avoid an unhandled rejection if this fires after we've already returned

  try {
    await Promise.race([waitForPort(port), exitedEarly]);
  } catch (error) {
    killConsoleGroup(child, 'SIGKILL');
    throw error;
  }

  return handle;
}

/**
 * Starts `next dev` and waits for the process to EXIT (rather than to listen) — for
 * scenarios where the console must refuse to start at all (R8).
 */
export function startConsoleExpectingExit(env: NodeJS.ProcessEnv, port: number, timeoutMs = 20_000): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawnNextDev(env, port);

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => (stdout += String(chunk)));
  child.stderr?.on('data', (chunk) => (stderr += String(chunk)));

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      killConsoleGroup(child, 'SIGKILL');
      reject(new Error(`console did not exit within ${timeoutMs}ms — stdout:\n${stdout}\nstderr:\n${stderr}`));
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

export async function stopConsole(handle: ConsoleHandle): Promise<void> {
  killConsoleGroup(handle.process, 'SIGTERM');
  const exited = await waitForExit(handle.process, STOP_GRACE_MS);
  if (!exited) {
    killConsoleGroup(handle.process, 'SIGKILL');
    await waitForExit(handle.process, STOP_GRACE_MS);
  }
  await waitForPortFree(handle.port);
}
