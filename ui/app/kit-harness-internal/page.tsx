import type { JSX } from 'react';
import { KitHarness } from './harness';

/**
 * Test-only fixture route (mirrors `ui/app/a11y-harness-internal/page.tsx`): no real
 * screen draws the ledger kit yet (the four screen sub-issues follow this one), so this
 * is the seam DRK-1682 §3 row "kit harness route" allows for the Playwright greyscale
 * and detail-panel scenarios to inspect real components directly.
 *
 * `force-dynamic` (only valid on a Server Component, hence this thin wrapper around the
 * client `KitHarness`): every stub component throws until Build lands, and a route
 * Next.js statically prerenders at build time would fail the production build — and the
 * Docker image build, acceptance scenario 18 — over a fixture the AT stage never runs
 * statically.
 */
export const dynamic = 'force-dynamic';

export default function KitHarnessPage(): JSX.Element {
  return <KitHarness />;
}
