/**
 * DRK-1679 §5:
 *   Scenario: The build fails on a design system violation
 *     Given a base control is written by hand where shadcn supplies one
 *     When the console is built
 *     Then the design system checks refuse it
 *     And the build fails
 *
 * DRK-1679 §7 slice note: proved by running the lint step over a deliberately-violating
 * fixture that is not part of the shipped source — never by committing a violation. The
 * fixture (a raw hex colour, which `Design/_adherence.oxlintrc.json`'s existing
 * `no-restricted-syntax` rule already forbids) is written to a temp directory outside
 * `ui/`, so it never ships. DRK-1679 §3 row 10 requires this at `error` severity, not the
 * shipped config's `warn` (raised in the console's own `ui/.oxlintrc.json`, which does not
 * exist yet — today's RED reason).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../support/test';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const UI_ROOT = path.resolve(TEST_DIR, '..', '..');

test('The build fails on a design system violation', () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), 'drk-1679-lint-fixture-'));
  try {
    // A base control written by hand, where shadcn supplies one: a raw hex colour literal.
    writeFileSync(
      path.join(fixtureDir, 'hand-written-button.tsx'),
      `export function HandWrittenButton() {\n  return <button style={{ background: '#aff33e' }}>Click</button>;\n}\n`,
    );

    let exitCode = 0;
    let output = '';
    try {
      output = execFileSync('pnpm', ['exec', 'oxlint', '-c', '.oxlintrc.json', fixtureDir], {
        cwd: UI_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (error) {
      const e = error as { status?: number | null; stdout?: string; stderr?: string };
      exitCode = e.status ?? 1;
      output = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }

    // The design system checks refuse it, and the build fails.
    expect(exitCode).not.toBe(0);
    expect(output.toLowerCase()).toMatch(/hex|design system/);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }

  // The console's own oxlint config exists and raises the shipped rules to `error`
  // (DRK-1679 §3 row 10) — extends, never edits, Design's own adherence config.
  const ownConfigPath = path.join(UI_ROOT, '.oxlintrc.json');
  expect(existsSync(ownConfigPath)).toBe(true);
  const ownConfig = JSON.parse(readFileSync(ownConfigPath, 'utf8'));
  expect(JSON.stringify(ownConfig)).toContain('error');
});
