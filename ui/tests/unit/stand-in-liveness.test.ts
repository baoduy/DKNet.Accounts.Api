/**
 * DRK-1725 §5:
 *   Scenario: A stand-in that stops fails the run at once
 *     Given the acceptance suite is running
 *     When the stand-in sign-in server stops
 *     Then the run fails at once and names the stand-in sign-in server
 *
 * Brief DRK-1735 R3 extends the same rule to every stand-in the suite starts — sign-in server,
 * ledger, cache and console — and §3 row 5 gives the wording: "stand-in sign-in server stopped".
 *
 * Each case runs two throwaway checks through the suite's own config: the first stops one
 * stand-in (only the one this run started — found through the run's own port), the second
 * would pass on its own. The run must fail naming the stand-in, the second check's body must
 * never run, and the run must end sooner than a check's own 30 s timeout would have caught it.
 */
import { describe, expect, test } from 'vitest';
import { runThrowawaySpecs } from './playwright-throwaway';

/** A check's own timeout in `playwright.config.ts` — "at once" means sooner than that. */
const CHECK_TIMEOUT_MS = 30_000;

const STAND_INS = [
  {
    name: 'sign-in server',
    portExport: 'FAKE_OIDC_PORT',
    stop: "execFileSync('fuser', ['-k', '-9', `${FAKE_OIDC_PORT}/tcp`]);",
  },
  {
    name: 'ledger',
    portExport: 'FAKE_LEDGER_PORT',
    stop: "execFileSync('fuser', ['-k', '-9', `${FAKE_LEDGER_PORT}/tcp`]);",
  },
  {
    name: 'cache',
    portExport: 'FAKE_REDIS_PORT',
    stop: [
      "const containers = execFileSync('docker', ['ps', '-q', '--filter', `publish=${FAKE_REDIS_PORT}`], { encoding: 'utf8' }).split('\\n').filter(Boolean);",
      "if (containers.length === 0) throw new Error(`no cache container publishes ${FAKE_REDIS_PORT}`);",
      "execFileSync('docker', ['kill', ...containers]);",
    ].join('\n  '),
  },
  {
    name: 'console',
    portExport: 'DEFAULT_CONSOLE_PORT',
    stop: "execFileSync('fuser', ['-k', '-9', `${DEFAULT_CONSOLE_PORT}/tcp`]);",
  },
];

describe('A stand-in that stops fails the run at once', () => {
  test.each(STAND_INS)('the stand-in $name', async ({ name, portExport, stop }) => {
    const run = await runThrowawaySpecs(
      (markerDir) => ({
        'stand-in-stops.spec.ts': `import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { test } from '../support/test';
import { ${portExport} } from '../support/fixtures';

test('the stand-in ${name} stops', async () => {
  ${stop}
  writeFileSync(${JSON.stringify(`${markerDir}/stopped`)}, String(Date.now()));
});

test('a check that runs after the stop', async () => {
  writeFileSync(${JSON.stringify(`${markerDir}/after`)}, 'ran');
});
`,
      }),
      { timeoutMs: 240_000 },
    );

    expect(run.markers.stopped, `the first check stopped the stand-in ${name}\n${run.output}`).toBeDefined();
    expect(run.output).toContain(`stand-in ${name} stopped`);
    expect(run.code, 'the run fails').not.toBe(0);
    expect(run.markers.after, 'no check runs after the stand-in stopped').toBeUndefined();
    expect(run.endedAt - Number(run.markers.stopped), 'the run ends at once').toBeLessThan(CHECK_TIMEOUT_MS);
  }, 300_000);
});
