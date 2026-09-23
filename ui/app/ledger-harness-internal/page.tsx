import type { JSX } from 'react';

/**
 * DRK-1684 §3 row 14 — test-only fixture route: a list + panel + posting form over the fake
 * ledger service (`tests/fakes/fake-ledger-service.ts`), mirroring `app/a11y-harness-
 * internal/page.tsx`, so the `@integration` scenarios in this slice (DRK-1679 §5) have
 * something to drive. Screens themselves stay out of scope (§4).
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build replaces this stub with the
 * real list/panel/form wired to `lib/query/*` and `lib/api/*`.
 */
export default function LedgerHarnessPage(): JSX.Element {
  throw new Error('Not implemented: DRK-1684 §3 row 14 — ledger harness route');
}
