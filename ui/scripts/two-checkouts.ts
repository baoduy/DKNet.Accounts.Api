/**
 * DRK-1725 §5:
 *   Scenario: Two checkouts run the checks side by side
 *     Given two checkouts of the console on one machine
 *     When both run the acceptance suite and the end-to-end check at the same time
 *     Then both runs pass
 *
 * Run by hand from `ui/`: `pnpm exec tsx scripts/two-checkouts.ts`. CI does not run it (brief
 * DRK-1735 §9 Q2 default) — it takes two full suites' time and needs docker.
 *
 * Copies this checkout twice into a scratch folder (every tracked or new file, never ignored
 * build output), installs each copy's dependencies from the lockfile, starts both acceptance
 * suites at the same moment, then both end-to-end checks at the same moment, and exits 0 only
 * when all four runs exit 0. The copies are removed afterwards; every run's log is kept and its
 * path printed.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { copyCheckout } from '../tests/e2e/support/checkout-copy';

const CHECKOUTS = ['checkout-a', 'checkout-b'];
const SUITES = ['test:acceptance', 'test:e2e'];

function runSuite(dest: string, suite: string, logPath: string): Promise<number | null> {
  const log = fs.openSync(logPath, 'w');
  const child = spawn('pnpm', ['run', suite], { cwd: path.join(dest, 'ui'), stdio: ['ignore', log, log] });
  return new Promise((resolve) => {
    child.on('close', (code) => {
      fs.closeSync(log);
      resolve(code);
    });
  });
}

async function main(): Promise<void> {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'two-checkouts-'));
  const dests = CHECKOUTS.map((name) => path.join(scratch, name));

  const logOf = (name: string, suite: string): string => path.join(scratch, `${name}-${suite.replace(':', '-')}.log`);
  const results: { name: string; suite: string; code: number | null }[] = [];
  try {
    for (const dest of dests) copyCheckout(dest);
    for (const suite of SUITES) {
      const codes = await Promise.all(dests.map((dest, index) => runSuite(dest, suite, logOf(CHECKOUTS[index], suite))));
      CHECKOUTS.forEach((name, index) => results.push({ name, suite, code: codes[index] }));
    }
  } finally {
    for (const dest of dests) fs.rmSync(dest, { recursive: true, force: true });
  }

  for (const { name, suite, code } of results) {
    console.log(`${name} ${suite}: exit ${code} — log ${logOf(name, suite)}`);
  }
  process.exit(results.length === CHECKOUTS.length * SUITES.length && results.every(({ code }) => code === 0) ? 0 : 1);
}

void main();
