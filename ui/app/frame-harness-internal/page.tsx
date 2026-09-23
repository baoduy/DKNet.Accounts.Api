import type { JSX } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Test-only fixture route (mirrors `ui/app/a11y-harness-internal/page.tsx`): no real screen
 * draws a card or a status badge yet (the 16 ledger components are surface C), so this is the
 * seam DRK-1679 §3 row 12 allows for "Every colour pair is readable in both themes" to inspect
 * a card and a status badge directly.
 */
export default function FrameHarnessPage(): JSX.Element {
  return (
    <div className="p-5">
      <Card data-testid="card">
        <CardContent>Body text on a card.</CardContent>
      </Card>
      <Badge data-testid="status-badge" className="mt-5 bg-badge-neutral-bg text-badge-neutral-fg">
        Neutral
      </Badge>
    </div>
  );
}
