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

/** Starts `next dev` on `env.PORT` and waits until it is listening. */
export async function startConsole(env: NodeJS.ProcessEnv, port: number): Promise<ConsoleHandle> {
  const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', String(port)], {
    cwd: UI_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const handle: ConsoleHandle = { process: child, stdout: '', stderr: '', port };
  child.stdout?.on('data', (chunk) => (handle.stdout += String(chunk)));
  child.stderr?.on('data', (chunk) => (handle.stderr += String(chunk)));

  await waitForPort(port);
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

export async function stopConsole(handle: ConsoleHandle): Promise<void> {
  handle.process.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    handle.process.once('exit', () => resolve());
    setTimeout(resolve, 5_000);
  });
}
