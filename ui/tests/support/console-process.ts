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

export interface ConsoleHandle {
  process: ChildProcess;
  stdout: string;
  stderr: string;
  port: number;
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

/**
 * `next dev` accepts the TCP connection the moment it starts listening, but does not compile
 * a route's module tree until the first *request* for it — `waitForPort` alone lets that
 * compile happen inside a spec's own (much shorter) `navigationTimeout` instead of here,
 * under a timeout sized for a cold compile. A response of any status confirms the route
 * handler actually ran; a connection error (the brief window between "listening" and
 * "routing", or — on a restart — the old process's port not yet released) just retries.
 */
async function warmUpRoute(baseUrl: string, path: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await fetch(`${baseUrl}${path}`);
      return;
    } catch {
      if (Date.now() > deadline) {
        throw new Error(`console did not answer ${path} on ${baseUrl} within ${timeoutMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

/**
 * Starts `next dev` on `env.PORT`, waits until it is listening, then warms `warmupPath` (the
 * first path the caller will `page.goto`) so the route is already compiled before the test's
 * own navigation — never a raw "is the port open" check.
 */
export async function startConsole(env: NodeJS.ProcessEnv, port: number, warmupPath = '/'): Promise<ConsoleHandle> {
  const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', String(port)], {
    cwd: UI_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Its own process group (`detached` on Linux sets pgid = pid) so `stopConsole` can signal
    // the whole tree at once: `pnpm exec next dev` forks the `next` CLI, which forks the
    // actual `next-server` worker that answers requests — a plain `child.kill()` only ever
    // reached the `pnpm` wrapper, leaving `next-server` running (and pegging a CPU core)
    // indefinitely after the test that started it had already moved on.
    detached: true,
  });

  const handle: ConsoleHandle = { process: child, stdout: '', stderr: '', port };
  child.stdout?.on('data', (chunk) => (handle.stdout += String(chunk)));
  child.stderr?.on('data', (chunk) => (handle.stderr += String(chunk)));

  await waitForPort(port);
  await warmUpRoute(`http://127.0.0.1:${port}`, warmupPath);
  return handle;
}

/**
 * Starts `next dev` and waits for the process to EXIT (rather than to listen) — for
 * scenarios where the console must refuse to start at all (R8).
 */
export function startConsoleExpectingExit(env: NodeJS.ProcessEnv, port: number, timeoutMs = 20_000): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', String(port)], {
    cwd: UI_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => (stdout += String(chunk)));
  child.stderr?.on('data', (chunk) => (stderr += String(chunk)));

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`console did not exit within ${timeoutMs}ms — stdout:\n${stdout}\nstderr:\n${stderr}`));
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

/** Signals the whole process group `startConsole` put `handle.process` in charge of. */
function killGroup(handle: ConsoleHandle, signal: NodeJS.Signals): void {
  try {
    process.kill(-handle.process.pid!, signal);
  } catch {
    // Group already gone, or this platform has no process groups — fall back to the direct child.
    handle.process.kill(signal);
  }
}

export async function stopConsole(handle: ConsoleHandle): Promise<void> {
  killGroup(handle, 'SIGTERM');
  const exited = await new Promise<boolean>((resolve) => {
    handle.process.once('exit', () => resolve(true));
    setTimeout(() => resolve(false), 5_000);
  });
  // A graceful SIGTERM that the `next-server` worker did not act on within the grace period —
  // force it, so no CPU-spinning orphan survives into the next test.
  if (!exited) {
    killGroup(handle, 'SIGKILL');
  }
}
