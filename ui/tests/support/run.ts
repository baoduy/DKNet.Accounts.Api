/**
 * One acceptance run's own ports and names (DRK-1726 R1): chosen when the suite's config first
 * loads, so two checkouts on one machine never meet on a port, a container or a build folder.
 *
 * Playwright loads `playwright.config.ts` once in the runner and again in every worker it
 * starts; both import this module. The runner allocates and publishes the run through
 * `CONSOLE_ACCEPTANCE_RUN`, and a worker (`TEST_WORKER_INDEX` set, env inherited from the
 * runner) reads it back — so the stand-ins the config starts, the global setup and every spec see
 * the same ports. Any other process that inherits the variable (a suite started from inside a
 * unit check) is a run of its own and allocates afresh.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RUN_ENV = 'CONSOLE_ACCEPTANCE_RUN';

export const UI_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const TSCONFIG_PATH = path.join(UI_ROOT, 'tsconfig.json');

export interface AcceptanceRun {
  /** The process that allocated the run. */
  owner: number;
  id: string;
  signInPort: number;
  ledgerPort: number;
  cachePort: number;
  consolePort: number;
  /** The console specs 08, 15, 16 and 17 start themselves — one at a time, one worker. */
  ownConsolePort: number;
  /** `tsconfig.json` as it was before any `next dev` of this run rewrote it (DRK-1726 §9 Q3). */
  tsconfig: string;
}

// ponytail: a port is free when the kernel hands it out and is bound by its stand-in seconds
// later; another process asking the kernel for a port in between could be handed the same one.
// Hand the listening sockets to the stand-ins instead if that ever shows up.
const FREE_PORTS_SCRIPT = `
const net = require('node:net');
const servers = Array.from({ length: Number(process.argv[1]) }, () => net.createServer());
let listening = 0;
for (const server of servers) server.listen(0, () => {
  if (++listening < servers.length) return;
  process.stdout.write(JSON.stringify(servers.map((s) => s.address().port)));
  for (const s of servers) s.close();
});`;

/** `count` distinct ports no process is listening on right now, chosen by the kernel. */
export function freePorts(count: number): number[] {
  return JSON.parse(execFileSync(process.execPath, ['-e', FREE_PORTS_SCRIPT, String(count)], { encoding: 'utf8' })) as number[];
}

function allocate(): AcceptanceRun {
  const [signInPort, ledgerPort, cachePort, consolePort, ownConsolePort] = freePorts(5);
  return {
    owner: process.pid,
    id: randomUUID().slice(0, 8),
    signInPort,
    ledgerPort,
    cachePort,
    consolePort,
    ownConsolePort,
    tsconfig: tsconfigBeforeAnyConsole(),
  };
}

/**
 * `tsconfig.json` as no `next dev` has rewritten it. A run started beside another one in the
 * same checkout (the unit checks start several) can find it already rewritten; the committed
 * file stands in then.
 */
function tsconfigBeforeAnyConsole(): string {
  const current = fs.readFileSync(TSCONFIG_PATH, 'utf8');
  if (!/\.next-[^/"]+\/types/.test(current)) return current;
  try {
    return execFileSync('git', ['show', 'HEAD:./tsconfig.json'], { cwd: UI_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return current;
  }
}

export function currentRun(): AcceptanceRun {
  const published = process.env[RUN_ENV];
  if (published) {
    const run = JSON.parse(published) as AcceptanceRun;
    if (process.env.TEST_WORKER_INDEX !== undefined || run.owner === process.pid) return run;
  }
  const run = allocate();
  process.env[RUN_ENV] = JSON.stringify(run);
  return run;
}

/**
 * `next dev` adds its build folder's types to `tsconfig.json` and builds into `.next-<port>`
 * (`next.config.ts`); with a port per run both would change every run. Puts the file back and
 * removes the folders of the consoles on `ports` — only this run's.
 */
export function restoreCheckout(tsconfig: string, ports: number[]): void {
  fs.writeFileSync(TSCONFIG_PATH, tsconfig);
  for (const port of ports) fs.rmSync(path.join(UI_ROOT, `.next-${port}`), { recursive: true, force: true });
}
