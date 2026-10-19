/**
 * DRK-2325 §5:
 *   @integration Scenario: Every forwarded transfer route is one the ledger declares
 *     When the console's route list is checked against the ledger's published routes
 *     Then every transfer route on the console's list is declared by the ledger
 *
 * The console's route list is `contract/openapi.json` (`lib/api/routes.ts` forwards exactly what
 * it declares). The check against the ledger's published routes is `verify:contract`, which CI
 * runs against the live document the API project publishes; here, as in
 * `40-build-fails-when-contract-out-of-date.spec.ts`, `LEDGER_OPENAPI_SOURCE_FILE` stands in for
 * that document. The spec proves both halves:
 *   1. the list holds the 3 transfer routes — and only those 3 name a transfer;
 *   2. a ledger document that no longer declares any one of them fails the check, naming it —
 *      so a transfer route on the list is one the ledger declares, or the build stops.
 *
 * RED today on half 1: no transfer route is on the console's list (brief §3 row 1).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../support/test';

const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

type OpenApiDoc = { paths: Record<string, Record<string, unknown>> };

function operations(doc: OpenApiDoc): string[] {
  return Object.entries(doc.paths).flatMap(([route, item]) => HTTP_METHODS.filter((method) => item[method]).map((method) => `${method.toUpperCase()} ${route}`));
}

/** `verify:contract` against `live` standing in for the ledger's published document. */
function verifyAgainst(live: OpenApiDoc): { exitCode: number; output: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'drk-2325-transfer-routes-'));
  try {
    const liveFile = path.join(dir, 'live-openapi.json');
    writeFileSync(liveFile, JSON.stringify(live));
    try {
      const output = execFileSync('pnpm', ['run', 'verify:contract'], { cwd: UI_ROOT, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, LEDGER_OPENAPI_SOURCE_FILE: liveFile } });
      return { exitCode: 0, output };
    } catch (error) {
      const e = error as { status?: number | null; stdout?: string; stderr?: string };
      return { exitCode: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('Every forwarded transfer route is one the ledger declares', () => {
  const committed = JSON.parse(readFileSync(path.join(UI_ROOT, 'contract', 'openapi.json'), 'utf8')) as OpenApiDoc;

  const transferRoutes = operations(committed).filter((operation) => /\/transfers(\/|$)/.test(operation));
  expect(transferRoutes.sort()).toEqual(['GET /accounts/{id}/transfers', 'GET /transfers/{id}', 'POST /transfers']);

  for (const operation of transferRoutes) {
    const [method, route] = operation.split(' ');
    const live = JSON.parse(JSON.stringify(committed)) as OpenApiDoc;
    delete live.paths[route][method.toLowerCase()];

    const { exitCode, output } = verifyAgainst(live);

    expect(exitCode, `verify:contract with ${operation} missing from the ledger`).not.toBe(0);
    expect(output).toContain(`${operation} is in the committed contract, but the live service no longer declares it.`);
  }
});
