// @vitest-environment node
/**
 * DRK-1780 — the console's UI test harness is deterministic in CI (brief DRK-1782 §7).
 *
 *   SC1 — The unit checks that start a console never run beside each other (R1).
 *   SC2 — A process that has exited counts as stopped even before it is reaped (R2).
 *   SC3 — A route's first visit has room for its compile (R3).
 *
 * SC1 reads the unit suite's config the way `vitest run` resolves it — Vitest's own
 * `createVitest`, no test run — and asks which pool each unit file lands in. Vitest 3.0 keeps one
 * worker pool per pool type (`forks`, `threads`, …) shared by every project, sized from the root
 * config, so "one at a time" means: the 4 files share a pool that runs a single worker and no
 * other unit file lands in it. Nothing here starts `next dev`.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { createVitest } from 'vitest/node';
import config from '../../playwright.config';
import { isRunning } from '../support/processes';

const UI_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

/** The 4 unit files that start a real `next dev` in this checkout (brief §2). */
const CONSOLE_STARTING_FILES = [
  'tests/unit/acceptance-harness.test.ts',
  'tests/unit/console-process.test.ts',
  'tests/unit/no-retry.test.ts',
  'tests/unit/stand-in-liveness.test.ts',
];

describe('SC1 — The unit checks that start a console never run beside each other', () => {
  test('the 4 console-starting files share one single-worker pool that no other unit file runs in', async () => {
    const vitest = await createVitest('test', { config: path.join(UI_ROOT, 'vitest.config.ts'), root: UI_ROOT, watch: false });
    try {
      const resolved = vitest.config;
      const specifications = await vitest.globTestSpecifications();
      // One entry per file per project that collects it: a file two projects collect runs twice.
      const runs = specifications.map((spec) => [path.relative(UI_ROOT, spec.moduleId), spec.pool] as const);
      // Every pool type's worker count comes from the root config (Vitest 3.0 `createPool`).
      const singleWorker = (pool: string): boolean => {
        const options = (resolved.poolOptions as Record<string, Record<string, unknown> | undefined> | undefined)?.[pool] ?? {};
        return (
          resolved.fileParallelism === false ||
          resolved.maxWorkers === 1 ||
          options.singleFork === true ||
          options.singleThread === true ||
          options.maxForks === 1 ||
          options.maxThreads === 1
        );
      };

      expect(
        CONSOLE_STARTING_FILES.map((file) => runs.filter(([run]) => run === file).length),
        'each console-starting file runs exactly once',
      ).toEqual([1, 1, 1, 1]);
      const consolePools = CONSOLE_STARTING_FILES.map((file) => runs.find(([run]) => run === file)![1]);
      expect(new Set(consolePools).size, `the console-starting files land in one pool: ${JSON.stringify(consolePools)}`).toBe(1);
      const consolePool = consolePools[0]!;
      expect(singleWorker(consolePool), `pool "${consolePool}" runs one file at a time`).toBe(true);

      const others = runs.filter(([file]) => !CONSOLE_STARTING_FILES.includes(file));
      expect(others.length, 'the other unit files are still collected').toBeGreaterThan(0);
      expect(others.filter(([, pool]) => pool === consolePool).map(([file]) => file), `no other unit file runs in pool "${consolePool}"`).toEqual([]);
      expect(
        others.filter(([, pool]) => singleWorker(pool)).map(([file]) => file),
        'every other unit file still runs in parallel',
      ).toEqual([]);
    } finally {
      await vitest.close();
    }
  });
});

describe('SC2 — A process that has exited counts as stopped even before it is reaped', () => {
  const children: ChildProcess[] = [];

  afterEach(async () => {
    await Promise.all(
      children.splice(0).map(
        (child) =>
          new Promise<void>((resolve) => {
            if (child.exitCode !== null || child.signalCode !== null) return resolve();
            child.once('exit', () => resolve());
            child.kill('SIGKILL');
          }),
      ),
    );
  });

  function start(command: string, args: string[]): ChildProcess {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    children.push(child);
    return child;
  }

  /** The process state letter from `/proc/<pid>/stat` — the field after the `(comm)` one. */
  function procState(pid: number): string | undefined {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      return stat.slice(stat.lastIndexOf(')') + 2, stat.lastIndexOf(')') + 3);
    } catch {
      return undefined;
    }
  }

  test('a process that exited and was never reaped (a zombie) is not running', async () => {
    // `sleep 0` exits at once; its parent `sh` has exec'd into `sleep 5`, which never reaps it.
    const parent = start('sh', ['-c', 'sleep 0 & echo $!; exec sleep 5']);
    const zombie = await new Promise<number>((resolve, reject) => {
      parent.stdout!.once('data', (chunk: Buffer) => resolve(Number(chunk.toString().trim())));
      parent.once('error', reject);
    });
    const deadline = Date.now() + 4_000;
    while (procState(zombie) !== 'Z') {
      if (Date.now() > deadline) throw new Error(`pid ${zombie} never became a zombie (state ${procState(zombie)})`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(isRunning(zombie)).toBe(false);
  });

  test('a live process is running', async () => {
    const child = start('sleep', ['5']);
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', () => resolve());
      child.once('error', reject);
    });

    expect(isRunning(child.pid!)).toBe(true);
  });

  test('a pid no process has is not running', async () => {
    const child = start('true', []);
    await new Promise<void>((resolve) => child.once('exit', () => resolve()));

    expect(isRunning(child.pid!)).toBe(false);
  });
});

describe("SC3 — A route's first visit has room for its compile", () => {
  test('a navigation gets 20 s while actions and expects keep 8 s', () => {
    expect(config.use?.navigationTimeout).toBe(20_000);
    expect(config.use?.actionTimeout).toBe(8_000);
    expect(config.expect?.timeout).toBe(8_000);
    expect(config.timeout).toBe(30_000);
  });
});
