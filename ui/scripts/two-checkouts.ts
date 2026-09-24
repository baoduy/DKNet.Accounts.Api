/**
 * DRK-1725 §5 (the acceptance-suite part; the end-to-end check joins it in a later stage):
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
 * suites at the same moment and exits 0 only when both runs exit 0. The copies are removed
 * afterwards; both runs' logs are kept and their paths printed.
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const CHECKOUTS = ['checkout-a', 'checkout-b'];

function checkoutFiles(): string[] {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' });
  return listed.split('\0').filter((file) => file && fs.existsSync(path.join(REPO_ROOT, file)));
}

function copyCheckout(files: string[], dest: string): void {
  for (const file of files) {
    const target = path.join(dest, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const source = path.join(REPO_ROOT, file);
    // Tracked symlinks (`.claude/skills/*`) are copied as links, never followed.
    if (fs.lstatSync(source).isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(source), target);
    else fs.copyFileSync(source, target);
  }
  execFileSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], { cwd: path.join(dest, 'ui'), stdio: 'inherit' });
}

function runSuite(dest: string, logPath: string): Promise<number | null> {
  const log = fs.openSync(logPath, 'w');
  const child = spawn('pnpm', ['run', 'test:acceptance'], { cwd: path.join(dest, 'ui'), stdio: ['ignore', log, log] });
  return new Promise((resolve) => {
    child.on('close', (code) => {
      fs.closeSync(log);
      resolve(code);
    });
  });
}

async function main(): Promise<void> {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'two-checkouts-'));
  const files = checkoutFiles();
  const dests = CHECKOUTS.map((name) => path.join(scratch, name));

  let codes: (number | null)[] = [];
  try {
    for (const dest of dests) copyCheckout(files, dest);
    codes = await Promise.all(dests.map((dest, index) => runSuite(dest, path.join(scratch, `${CHECKOUTS[index]}.log`))));
  } finally {
    for (const dest of dests) fs.rmSync(dest, { recursive: true, force: true });
  }

  CHECKOUTS.forEach((name, index) => {
    console.log(`${name}: exit ${codes[index]} — log ${path.join(scratch, `${name}.log`)}`);
  });
  process.exit(codes.length === CHECKOUTS.length && codes.every((code) => code === 0) ? 0 : 1);
}

void main();
