// @vitest-environment node
/**
 * DRK-1732 R2 (brief §9 Q8): the end-to-end runner (`tests/e2e/support/global-setup.ts`) removes
 * the stack it started however the run ends — pass, fail, the stack never coming up, the process
 * exiting early, Ctrl+C (SIGINT) and SIGTERM — and only ever names its own project.
 *
 * Each check runs the global setup in a child process with a stand-in `docker` first on PATH
 * that records every call, so no real stack is started; `compose up` answers the way each case
 * needs (comes up, fails, or is still building when the signal arrives).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UI_ROOT } from '../support/run';

const GLOBAL_SETUP = path.join(UI_ROOT, 'tests', 'e2e', 'support', 'global-setup.ts');
const COMPOSE = 'compose -p dknet-e2e-unitrun -f docker-compose.yml -f docker-compose.e2e.yml';
const DOWN = `${COMPOSE} down -v --remove-orphans --timeout 5`;
const IMAGES = 'image rm -f dknet-accounts-api:e2e-unitrun dknet-accounts-console:e2e-unitrun';

const FAKE_DOCKER = `#!/bin/sh
echo "$*" >> "$FAKE_DOCKER_LOG"
case " $* " in
  *" up "*)
    echo "$CONSOLE_E2E_TLS_DIR" > "$FAKE_DOCKER_LOG.tls"
    [ -n "$FAKE_UP_EXIT" ] && exit "$FAKE_UP_EXIT"
    [ -n "$FAKE_UP_HANG" ] && echo $$ > "$FAKE_DOCKER_LOG.up-pid" && exec sleep 60
    ;;
esac
exit 0
`;

// What the child does with the setup: MODE=pass tears down twice, MODE=exit leaves without
// tearing down, MODE=fail reports the rejection, MODE=signal waits for the signal.
const HARNESS = `
import fs from 'node:fs';
import globalSetup from ${JSON.stringify(GLOBAL_SETUP)};
if (process.env.OTHER_SIGTERM_LISTENER) process.on('SIGTERM', () => setTimeout(() => process.exit(7), 300));
const mode = process.env.MODE;
try {
  const teardown = await globalSetup();
  console.log('STACK ' + process.env.CONSOLE_E2E_STACK);
  if (mode === 'exit') process.exit(0);
  await teardown();
  await teardown();
} catch (error) {
  console.log('REJECTED ' + (error as Error).message);
  console.log('CALLS BY THEN ' + fs.readFileSync(process.env.FAKE_DOCKER_LOG!, 'utf8').split('\\n').filter(Boolean).length);
}
`;

let scratch: string;
let log: string;

beforeEach(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-teardown-'));
  fs.mkdirSync(path.join(scratch, 'bin'));
  fs.writeFileSync(path.join(scratch, 'bin', 'docker'), FAKE_DOCKER, { mode: 0o755 });
  fs.writeFileSync(path.join(scratch, 'harness.mts'), HARNESS);
  log = path.join(scratch, 'docker.log');
});

afterEach(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});

interface Run {
  code: number | null;
  output: string;
  calls: string[];
}

function calls(): string[] {
  return fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
}

function runSetup(env: Record<string, string>, signal?: NodeJS.Signals): Promise<Run> {
  // Plain node with tsx's loader only: the `tsx` command relays signals itself and would turn a
  // signal the setup ignores into a clean exit, which Playwright's runner never does.
  const child = spawn(process.execPath, ['--import', 'tsx', path.join(scratch, 'harness.mts')], {
    cwd: UI_ROOT,
    env: { ...process.env, PATH: `${path.join(scratch, 'bin')}${path.delimiter}${process.env.PATH}`, FAKE_DOCKER_LOG: log, CONSOLE_E2E_RUN_ID: 'unitrun', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += String(chunk)));
  child.stderr.on('data', (chunk) => (output += String(chunk)));
  const watch = signal
    ? setInterval(() => {
        if (calls().some((call) => call.includes(' up '))) {
          clearInterval(watch);
          child.kill(signal);
        }
      }, 100)
    : undefined;
  return new Promise((resolve) => {
    child.on('close', (code) => {
      clearInterval(watch);
      resolve({ code, output, calls: calls() });
    });
  });
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function tlsDir(): string {
  return fs.readFileSync(`${log}.tls`, 'utf8').trim();
}

describe('the end-to-end runner removes the stack it started (DRK-1732 R2)', () => {
  it('starts only its own project, publishes it, and removes it once when the run ends', async () => {
    const run = await runSetup({ MODE: 'pass' });

    expect(run.code, run.output).toBe(0);
    expect(run.calls).toEqual([`${COMPOSE} up --build --wait --wait-timeout 600`, DOWN, IMAGES]);
    const stack = JSON.parse(/^STACK (.*)$/m.exec(run.output)![1]) as { project: string; consoleBaseUrl: string };
    expect(stack.project).toBe('dknet-e2e-unitrun');
    expect(stack.consoleBaseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(fs.existsSync(tlsDir())).toBe(false);
  });

  it('names a fresh project when the run is given no id', async () => {
    const run = await runSetup({ MODE: 'pass', CONSOLE_E2E_RUN_ID: '' });

    expect(run.code, run.output).toBe(0);
    const project = (JSON.parse(/^STACK (.*)$/m.exec(run.output)![1]) as { project: string }).project;
    expect(project).toMatch(/^dknet-e2e-[0-9a-f]{8}$/);
    expect(run.calls[1]).toBe(`compose -p ${project} -f docker-compose.yml -f docker-compose.e2e.yml down -v --remove-orphans --timeout 5`);
  });

  it('removes the stack when it never comes up, and fails the run', async () => {
    const run = await runSetup({ MODE: 'fail', FAKE_UP_EXIT: '3' });

    expect(run.output).toMatch(/^REJECTED docker compose up for dknet-e2e-unitrun exited 3$/m);
    expect(run.output).toMatch(/^CALLS BY THEN 3$/m);
    expect(run.calls.slice(1)).toEqual([DOWN, IMAGES]);
    expect(fs.existsSync(tlsDir())).toBe(false);
  });

  it('removes the stack when the process exits without tearing down', async () => {
    const run = await runSetup({ MODE: 'exit' });

    expect(run.code, run.output).toBe(0);
    expect(run.calls.slice(1)).toEqual([DOWN, IMAGES]);
  });

  it.each([
    ['SIGINT', 130],
    ['SIGTERM', 143],
    ['SIGHUP', 129],
  ] as const)('removes the stack on %s (Ctrl+C, a stop, a closed terminal) while it is still starting, and ends the run', async (signal, exitCode) => {
    const run = await runSetup({ MODE: 'signal', FAKE_UP_HANG: '1' }, signal);

    expect(run.code, run.output).toBe(exitCode);
    expect(run.calls.slice(1)).toEqual([DOWN, IMAGES]);
    expect(fs.existsSync(tlsDir())).toBe(false);
    expect(alive(Number(fs.readFileSync(`${log}.up-pid`, 'utf8'))), 'compose up still running').toBe(false);
  });

  it('removes the stack on a signal someone else also handles, and leaves ending the run to them', async () => {
    const run = await runSetup({ MODE: 'signal', FAKE_UP_HANG: '1', OTHER_SIGTERM_LISTENER: '1' }, 'SIGTERM');

    expect(run.code, run.output).toBe(7);
    expect(run.calls.slice(1)).toEqual([DOWN, IMAGES]);
  });
});
