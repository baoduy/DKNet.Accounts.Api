'use client';

import type { JSX } from 'react';

/**
 * DRK-1713 §3 row 6 — the Records screen: postings across every account, with period,
 * narrowing, search, sort, page and open posting in the page address; the shared record and
 * reverse forms. Build stage implements the body; this stub only pins the signature the
 * acceptance tests (`RecordsScreen.test.tsx`) compile against.
 */
export interface RecordsScreenProps {
  grantedScopes: string[];
}

export function RecordsScreen(_props: RecordsScreenProps): JSX.Element {
  throw new Error('Not implemented — DRK-1713 Build stage (row 6).');
}
