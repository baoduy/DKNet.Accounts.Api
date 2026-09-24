/**
 * DRK-1726 — the parts of the acceptance harness the frozen checks do not reach on their own:
 * the run-wide stand-in watch stopping the run (R3), a run removing what it started (R2), and
 * the ledger helpers refusing to go on after a request that did not land (§3 row 7).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { FAKE_LEDGER_PORT } from '../support/fixtures';
import { resetLedger, seedCurrencies } from '../support/ledger';
import { UI_ROOT, runThrowawaySpecs } from './playwright-throwaway';

/** Writes into `argv[2]` every 5 ms while the console on port `argv[1]` answers; exits once it does not. */
const WRITER = `
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const [port, dir] = process.argv.slice(1);
let n = 0;
const tick = () => {
  const socket = net.connect(Number(port), '127.0.0.1');
  socket.once('connect', () => {
    socket.destroy();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'chunk-' + (n++ % 50)), 'x');
    setTimeout(tick, 5);
  });
  socket.once('error', () => process.exit(0));
};
tick();`;

async function waitForExit(pid: number, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    if (Date.now() > deadline) throw new Error(`process ${pid} still running after ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

describe('the acceptance run', () => {
  test('a stand-in that stops ends the run: the checks after it never start', async () => {
    const run = await runThrowawaySpecs(
      () => ({
        'stand-in-stops-early.spec.ts': `import { execFileSync } from 'node:child_process';
import { test } from '../support/test';
import { FAKE_LEDGER_PORT } from '../support/fixtures';

test('the stand-in ledger stops', async () => {
  execFileSync('fuser', ['-k', '-9', \`\${FAKE_LEDGER_PORT}/tcp\`]);
});

for (const n of [1, 2, 3, 4, 5]) test(\`later check \${n}\`, async () => {});
`,
      }),
      { timeoutMs: 240_000 },
    );

    expect(run.output).toContain('stand-in ledger stopped — the run stops here.');
    // Playwright's summary: the checks the interrupted run never started.
    expect(run.output).toMatch(/\n {2}[1-5] did not run\n/);
    expect(run.output).not.toMatch(/\n {2}6 failed\n/);
  }, 300_000);

  test('a check that holds its worker past the stand-ins\' keep-alive still passes', async () => {
    // The stand-ins close an idle connection after 5 s (Node's `keepAliveTimeout`); spec 18's
    // image build holds its worker longer. A probe that reused the connection from before the
    // check would read the closed connection as a stand-in that stopped.
    const run = await runThrowawaySpecs(
      () => ({
        'holds-the-worker.spec.ts': `import { execFileSync } from 'node:child_process';
import { test } from '../support/test';

test('holds its worker for 7 s', async () => {
  execFileSync('sleep', ['7']);
});
`,
      }),
      { timeoutMs: 240_000 },
    );

    expect(run.code, run.output).toBe(0);
  }, 300_000);

  test('a run removes its own cache container and console build folder', async () => {
    const run = await runThrowawaySpecs(
      (markerDir) => ({
        'what-the-run-started.spec.ts': `import { writeFileSync } from 'node:fs';
import { test } from '../support/test';
import { DEFAULT_CONSOLE_PORT, FAKE_REDIS_CONTAINER } from '../support/fixtures';

test('names what the run started', async () => {
  writeFileSync(${JSON.stringify(`${markerDir}/container`)}, FAKE_REDIS_CONTAINER);
  writeFileSync(${JSON.stringify(`${markerDir}/console-port`)}, String(DEFAULT_CONSOLE_PORT));
});
`,
      }),
      { timeoutMs: 240_000 },
    );

    expect(run.code, run.output).toBe(0);
    expect(run.markers.container).toMatch(/^console-acceptance-cache-[0-9a-f]{8}$/);
    const containers = execFileSync('docker', ['ps', '-a', '-q', '--filter', `name=^${run.markers.container}$`], { encoding: 'utf8' });
    expect(containers.trim()).toBe('');
    expect(fs.existsSync(path.join(UI_ROOT, `.next-${run.markers['console-port']}`))).toBe(false);
  }, 300_000);

  test('a console build folder written to until the console stops is still removed', async () => {
    // DRK-1734 B2: `next dev` writes into its build folder for as long as it runs, and the
    // shared console is a `webServer`, stopped only after the global teardown. This writer
    // stands in for it: it writes into the folder until the console stops answering, so a
    // cleanup that ran while the console was still up would meet a folder still filling.
    const run = await runThrowawaySpecs(
      (markerDir) => ({
        'console-keeps-writing.spec.ts': `import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from '../support/test';
import { DEFAULT_CONSOLE_PORT } from '../support/fixtures';
import { UI_ROOT } from '../support/run';

test('something writes into the console build folder until the console stops', async () => {
  const dir = path.join(UI_ROOT, \`.next-\${DEFAULT_CONSOLE_PORT}\`, 'drk1734-writer');
  const writer = spawn(process.execPath, ['-e', ${JSON.stringify(WRITER)}, String(DEFAULT_CONSOLE_PORT), dir], { detached: true, stdio: 'ignore' });
  writer.unref();
  writeFileSync(${JSON.stringify(`${markerDir}/console-port`)}, String(DEFAULT_CONSOLE_PORT));
  writeFileSync(${JSON.stringify(`${markerDir}/writer`)}, String(writer.pid));
});
`,
      }),
      { timeoutMs: 240_000 },
    );

    await waitForExit(Number(run.markers.writer));
    expect(run.code, run.output).toBe(0);
    expect(fs.existsSync(path.join(UI_ROOT, `.next-${run.markers['console-port']}`))).toBe(false);
  }, 300_000);
});

describe('the ledger helpers', () => {
  let server: http.Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
  });

  test('a request the stand-in ledger refuses to answer names the route', async () => {
    await expect(resetLedger()).rejects.toEqual(new Error('stand-in ledger did not answer POST /__reset: fetch failed'));
  });

  test('an answer outside 2xx names the route and the status', async () => {
    server = http.createServer((_request, response) => {
      response.writeHead(500);
      response.end('seed rejected');
    });
    await new Promise<void>((resolve) => server!.listen(FAKE_LEDGER_PORT, '127.0.0.1', () => resolve()));

    await expect(seedCurrencies([{ code: 'SGD', decimalPlaces: 2 }])).rejects.toEqual(new Error('stand-in ledger answered POST /__seed with 500: seed rejected'));
  });

  test('a 2xx answer is returned', async () => {
    server = http.createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"ok":true}');
    });
    await new Promise<void>((resolve) => server!.listen(FAKE_LEDGER_PORT, '127.0.0.1', () => resolve()));

    await expect(resetLedger()).resolves.toBeUndefined();
  });
});
