/**
 * DRK-1684 §3 row 3 — regenerates the OpenAPI document from the live/served ledger service
 * and fails when the committed `contract/openapi.json` no longer matches it, naming the
 * drift. Wired into CI ahead of `typecheck` (`.github/workflows/build.yml`).
 *
 * DRK-1679 §9 Q1: in CI this runs the API project (`dotnet`, already set up in
 * `build.yml`) to produce the live document. `LEDGER_OPENAPI_SOURCE_FILE`, when set, reads
 * the live document from that file instead — the seam `40-build-fails-when-contract-out-of-
 * date.spec.ts` uses so the acceptance suite never needs a `dotnet` build in its own loop.
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build turns
 * `37-console-refuses-route-outside-contract.spec.ts` and
 * `40-build-fails-when-contract-out-of-date.spec.ts` green by replacing this stub.
 */
async function verifyContract(): Promise<never> {
  throw new Error('Not implemented: DRK-1684 §3 row 3 — verify:contract drift check');
}

verifyContract().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
