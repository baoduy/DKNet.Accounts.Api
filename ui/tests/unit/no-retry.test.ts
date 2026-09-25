/**
 * DRK-1725 §5:
 *   Scenario: A failing check is never retried into a pass
 *     Given a check that fails on its first attempt and would pass on a second
 *     When the acceptance suite runs
 *     Then the run fails and names that check
 *
 * Brief DRK-1735 R5 (zero retries anywhere) and §3 row 11: the suite's config sets no retry,
 * no acceptance check configures one, and nothing that starts the suite (`package.json`, the
 * build pipeline) passes one. The behaviour itself is proven by running a throwaway check
 * through the suite's own config, with `CI` set as the build pipeline sets it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import config from '../../playwright.config';
import { UI_ROOT, runThrowawaySpecs } from './playwright-throwaway';

const REPO_ROOT = path.resolve(UI_ROOT, '..');
const ACCEPTANCE_DIR = path.join(UI_ROOT, 'tests', 'acceptance');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');

const CHECK_TITLE = 'a check that fails on its first attempt and would pass on a second';

describe('A failing check is never retried into a pass', () => {
  test('the suite config sets no retry', () => {
    expect(config.retries ?? 0).toBe(0);
    expect((config.projects ?? []).map((project) => project.retries ?? 0).filter((retries) => retries > 0)).toEqual([]);
  });

  test('no acceptance check configures a retry', () => {
    const configuring = fs
      .readdirSync(ACCEPTANCE_DIR)
      .filter((name) => /\bretries\b/.test(fs.readFileSync(path.join(ACCEPTANCE_DIR, name), 'utf8')));
    expect(configuring).toEqual([]);
  });

  test('nothing that starts the suite passes a retry', () => {
    const scripts = Object.entries(JSON.parse(fs.readFileSync(path.join(UI_ROOT, 'package.json'), 'utf8')).scripts as Record<string, string>)
      .filter(([, command]) => /--retries/.test(command))
      .map(([name]) => `package.json scripts.${name}`);
    const workflowLines = fs
      .readdirSync(WORKFLOWS_DIR)
      .flatMap((name) =>
        fs
          .readFileSync(path.join(WORKFLOWS_DIR, name), 'utf8')
          .split('\n')
          .map((line, index) => ({ where: `.github/workflows/${name}:${index + 1}`, line })),
      )
      .filter(({ line }) => /--retries/.test(line))
      .map(({ where }) => where);
    expect([...scripts, ...workflowLines]).toEqual([]);
  });

  test(
    'the run fails and names that check',
    async () => {
      const run = await runThrowawaySpecs(
        (markerDir) => ({
          'fails-once.spec.ts': `import { appendFileSync } from 'node:fs';
import { expect, test } from '../support/test';

test(${JSON.stringify(CHECK_TITLE)}, async ({}, testInfo) => {
  appendFileSync(${JSON.stringify(`${markerDir}/attempts`)}, 'x');
  expect(testInfo.retry, 'the first attempt fails').toBeGreaterThan(0);
});
`,
        }),
        { timeoutMs: 240_000, env: { CI: 'true' } },
      );

      expect(run.markers.attempts, `the check ran exactly once\n${run.output}`).toBe('x');
      expect(run.code, 'the run fails').not.toBe(0);
      expect(run.output).toContain(CHECK_TITLE);
      expect(run.output).toContain('1 failed');
      expect(run.output).not.toContain('flaky');
    },
    300_000,
  );
});
