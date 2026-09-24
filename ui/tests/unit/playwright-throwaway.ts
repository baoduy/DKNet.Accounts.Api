/**
 * Runs throwaway Playwright specs through the acceptance suite's own `playwright.config.ts` —
 * its stand-ins, reporters, fixtures and retry setting — so a unit check can observe how the
 * real suite behaves when a check fails or a stand-in stops.
 *
 * A one-off wrapper config re-points the real config's `testDir` at a scratch folder. Both
 * live inside `ui/` so every relative path the real config names (`tests/fakes/…`,
 * `./scripts/…`) resolves exactly as it does for `pnpm run test:acceptance`; both are removed
 * afterwards. Specs record what they did as marker files in a separate scratch folder, read
 * back after the run.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UI_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const PLAYWRIGHT_BIN = path.join(UI_ROOT, 'node_modules', '.bin', 'playwright');

export interface ThrowawayRun {
  code: number | null;
  output: string;
  /** Marker file name → its content, for every marker a spec wrote. */
  markers: Record<string, string>;
  /** When the playwright process exited (epoch ms). */
  endedAt: number;
}

/**
 * `specs` maps a spec file name to its source; `markerDir` is the absolute folder a spec
 * writes its markers into. Specs sit one level below `tests/`, so `../support/test` and
 * `../support/fixtures` import the suite's own harness.
 */
export async function runThrowawaySpecs(
  specs: (markerDir: string) => Record<string, string>,
  { timeoutMs, env = {} }: { timeoutMs: number; env?: Record<string, string> },
): Promise<ThrowawayRun> {
  const id = randomUUID().slice(0, 8);
  const specDirName = `tmp-throwaway-${id}`;
  const specDir = path.join(UI_ROOT, 'tests', specDirName);
  const configPath = path.join(UI_ROOT, `playwright.throwaway-${id}.config.ts`);
  const markerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-throwaway-markers-'));

  try {
    fs.mkdirSync(specDir);
    for (const [name, source] of Object.entries(specs(markerDir))) {
      fs.writeFileSync(path.join(specDir, name), source);
    }
    fs.writeFileSync(
      configPath,
      `import base from './playwright.config';\nexport default { ...base, testDir: './tests/${specDirName}' };\n`,
    );

    const { code, output, endedAt } = await runPlaywright(configPath, timeoutMs, env);
    const markers = Object.fromEntries(fs.readdirSync(markerDir).map((name) => [name, fs.readFileSync(path.join(markerDir, name), 'utf8')]));
    return { code, output, markers, endedAt };
  } finally {
    fs.rmSync(specDir, { recursive: true, force: true });
    fs.rmSync(configPath, { force: true });
    fs.rmSync(markerDir, { recursive: true, force: true });
  }
}

function runPlaywright(configPath: string, timeoutMs: number, extraEnv: Record<string, string>): Promise<{ code: number | null; output: string; endedAt: number }> {
  const child = spawn(PLAYWRIGHT_BIN, ['test', '--config', configPath], {
    cwd: UI_ROOT,
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  let output = '';
  child.stdout?.on('data', (chunk) => (output += String(chunk)));
  child.stderr?.on('data', (chunk) => (output += String(chunk)));

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (child.pid !== undefined) process.kill(-child.pid, 'SIGKILL');
      reject(new Error(`playwright did not finish within ${timeoutMs}ms — output:\n${output}`));
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, output, endedAt: Date.now() });
    });
  });
}
