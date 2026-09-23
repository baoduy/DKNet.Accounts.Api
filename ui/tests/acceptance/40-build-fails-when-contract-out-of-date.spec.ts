/**
 * DRK-1679 §5:
 *   Scenario: The build fails when the console's copy of the contract is out of date
 *     Given the ledger service has changed a route since the console's contract was generated
 *     When the console is built
 *     Then the build fails and names the drift
 *
 * DRK-1679 §9 Q1: in CI, `verify:contract` regenerates the document from the API project in
 * the same workflow and diffs it against `contract/openapi.json`. For this acceptance test
 * (no `dotnet` build in the loop), `verify-contract.ts` reads `LEDGER_OPENAPI_SOURCE_FILE`
 * when set, standing in for "the live document" — a fixture file that has moved
 * `/postings/{id}/reverse`, never committed under `ui/`, mirroring
 * `24-build-fails-on-design-system-violation.spec.ts`'s temp-fixture pattern.
 *
 * RED today: `scripts/verify-contract.ts` is a stub that always throws its own generic
 * "not implemented" message, never the name of the drifted route.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const UI_ROOT = path.resolve(TEST_DIR, '..', '..');

test("The build fails when the console's copy of the contract is out of date", () => {
  const fixtureDir = mkdtempSync(path.join(tmpdir(), 'drk-1684-contract-drift-'));
  try {
    const committed = JSON.parse(readFileSync(path.join(UI_ROOT, 'contract', 'openapi.json'), 'utf8'));
    const drifted = JSON.parse(JSON.stringify(committed));
    delete drifted.paths['/postings/{id}/reverse'];
    drifted.paths['/postings/{id}/reverse-moved'] = committed.paths['/postings/{id}/reverse'];
    const liveFile = path.join(fixtureDir, 'live-openapi.json');
    writeFileSync(liveFile, JSON.stringify(drifted));

    let exitCode = 0;
    let output = '';
    try {
      output = execFileSync('pnpm', ['run', 'verify:contract'], {
        cwd: UI_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, LEDGER_OPENAPI_SOURCE_FILE: liveFile },
      });
    } catch (error) {
      const e = error as { status?: number | null; stdout?: string; stderr?: string };
      exitCode = e.status ?? 1;
      output = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }

    expect(exitCode).not.toBe(0);
    expect(output).toContain('/postings/{id}/reverse');
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
