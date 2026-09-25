/**
 * A second checkout of this repository on the same machine: every tracked or new file, never
 * ignored build output, with the console's dependencies installed from the lockfile. Used by
 * `scripts/two-checkouts.ts` and the developer's stack of check 172.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { UI_ROOT } from '../../support/run';

const REPO_ROOT = path.resolve(UI_ROOT, '..');

function checkoutFiles(): string[] {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' });
  return listed.split('\0').filter((file) => file && fs.existsSync(path.join(REPO_ROOT, file)));
}

export function copyCheckout(dest: string, stdio: 'inherit' | 'ignore' = 'inherit'): void {
  for (const file of checkoutFiles()) {
    const target = path.join(dest, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const source = path.join(REPO_ROOT, file);
    // Tracked symlinks (`.claude/skills/*`) are copied as links, never followed.
    if (fs.lstatSync(source).isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(source), target);
    else fs.copyFileSync(source, target);
  }
  execFileSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], { cwd: path.join(dest, 'ui'), stdio });
}
