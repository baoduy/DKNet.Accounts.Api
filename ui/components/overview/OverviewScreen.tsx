'use client';

import type { JSX } from 'react';

/**
 * DRK-1727 §3 row 6 — the Overview screen: the page's own search, the position by currency,
 * the status counts, postings per week, accounts opened per month, the stated gap and recently
 * viewed. Build stage implements the body; this stub only pins the signature the acceptance
 * tests (`OverviewScreen.acceptance.test.tsx`) compile against.
 */
export interface OverviewScreenProps {
  grantedScopes: string[];
  /** The signed-in operator's directory object id — keys their recently viewed list (§3a). */
  directoryObjectId: string;
}

export function OverviewScreen(_props: OverviewScreenProps): JSX.Element {
  throw new Error('Not implemented — DRK-1728 Build stage (row 6).');
}
