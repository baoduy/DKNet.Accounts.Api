import type { JSX } from 'react';

/**
 * Test-only fixture route (DRK-1679 §3 row 12), mirroring
 * `ui/app/a11y-harness-internal/page.tsx`: renders the two surfaces the acceptance
 * scenario "Every colour pair is readable in both themes" needs to inspect — a card with
 * body text, and a status badge on its ground — since no real screen draws either yet (the
 * 16 ledger components are out of scope for this slice).
 */
export default function FrameHarnessPage(): JSX.Element {
  return (
    <div>
      <div data-testid="card" style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}>
        Body text on a card.
      </div>
      <span data-testid="status-badge" style={{ background: 'var(--badge-neutral-bg)', color: 'var(--badge-neutral-fg)' }}>
        Posted
      </span>
    </div>
  );
}
