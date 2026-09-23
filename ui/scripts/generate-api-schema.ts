/**
 * Regenerates `lib/api/schema.d.ts` from `contract/openapi.json` (DRK-1684 §3 row 2) — the
 * one place a route's TypeScript shape is produced; nobody hand-writes a route type.
 * Thin wrapper so `pnpm run generate:api-schema` is the one command both a developer and
 * `verify:contract` (row 3) run.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import { writeFileSync } from 'node:fs';

const UI_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const CONTRACT_PATH = path.join(UI_ROOT, 'contract', 'openapi.json');
const SCHEMA_PATH = path.join(UI_ROOT, 'lib', 'api', 'schema.d.ts');

async function main(): Promise<void> {
  const ast = await openapiTS(new URL(`file://${CONTRACT_PATH}`));
  writeFileSync(SCHEMA_PATH, astToString(ast));
  // eslint-disable-next-line no-console
  console.log(`generated ${path.relative(UI_ROOT, SCHEMA_PATH)} from ${path.relative(UI_ROOT, CONTRACT_PATH)}`);
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
