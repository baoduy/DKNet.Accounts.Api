/**
 * DRK-1725 §3 "A reliable acceptance suite": no port, container name or stack name is fixed
 * (brief DRK-1735 R1, change-set rows 1-3). Two checkouts on one machine collide on any value
 * that is the same in both, so none of the values the suite fixed at `6fae2e3` may be left
 * anywhere in `ui/` — config, support, fakes, specs or the `lib/` unit tests.
 *
 * The literals are the ones the brief names (§2): the stand-in sign-in server 4488, the
 * stand-in ledger 4499, the stand-in cache 16532 and its container name, the shared console
 * 3100, and the own-console ports of specs 08/15/16/17 and `console-process.test.ts`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const THIS_FILE = fileURLToPath(import.meta.url);
const UI_ROOT = path.resolve(THIS_FILE, '../../..');

const FIXED_PORTS = ['4488', '4499', '16532', '3100', '3201', '3203', '3204', '3205', '3301', '3302', '3303'];
const FIXED_NAMES = ['drk1673-fake-redis'];

const TEXT_FILE = /\.(ts|tsx|mts|cts|js|mjs|cjs|json|ya?ml|md)$|(^|\/)Dockerfile$/;

/** Every file a checkout of `ui/` carries — tracked or new, never ignored build output. */
function checkoutFiles(): string[] {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: UI_ROOT, encoding: 'utf8' });
  return listed
    .split('\0')
    .filter((file) => file && TEXT_FILE.test(file) && file !== 'pnpm-lock.yaml')
    .map((file) => path.join(UI_ROOT, file))
    .filter((file) => file !== THIS_FILE && fs.existsSync(file));
}

test('No port or container name in ui/ is fixed', () => {
  const patterns = [
    ...FIXED_PORTS.map((port) => ({ literal: port, pattern: new RegExp(`(?<![\\w.])${port}(?!\\w)`) })),
    ...FIXED_NAMES.map((name) => ({ literal: name, pattern: new RegExp(name) })),
  ];

  const found: string[] = [];
  for (const file of checkoutFiles()) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const { literal, pattern } of patterns) {
        if (pattern.test(line)) found.push(`${path.relative(UI_ROOT, file)}:${index + 1} fixes ${literal}`);
      }
    });
  }

  expect(found).toEqual([]);
});
