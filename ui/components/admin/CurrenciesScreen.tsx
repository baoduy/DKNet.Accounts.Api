'use client';

import type { JSX } from 'react';

/**
 * DRK-1697 §3 row 12 — list (code, name, decimal places, status); registration form with the
 * live worked example; rename; deactivate/reactivate. Build stage implements the body; this
 * stub only pins the signature `app/currencies/page.tsx` (row 13) compiles against.
 */
export interface CurrenciesScreenProps {
  grantedScopes: string[];
}

export function CurrenciesScreen(_props: CurrenciesScreenProps): JSX.Element {
  throw new Error('Not implemented — DRK-1697 Build stage (row 12).');
}
