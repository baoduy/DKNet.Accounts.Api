import type { JSX } from 'react';

// Reads live config and the session cookie on every request — never statically prerendered.
export const dynamic = 'force-dynamic';

/** `GET /transfers` — DRK-2325 §3 row 7. Acceptance-test stub (DRK-2326): the Build run mirrors
 * `app/records/page.tsx` here. */
export default async function TransfersPage(): Promise<JSX.Element> {
  throw new Error('Not implemented: the Transfers page (DRK-2325 §3 row 7).');
}
