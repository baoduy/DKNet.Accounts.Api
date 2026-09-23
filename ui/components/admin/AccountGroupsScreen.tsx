'use client';

import type { JSX } from 'react';

/**
 * DRK-1697 §3 row 11 — list narrowed by owner id and status, sorted, paged, URL-backed;
 * create/edit form; balances via `CurrencyBalanceList`; `ScopeGate`d close/delete/reopen.
 * Build stage implements the body; this stub only pins the signature `app/groups/page.tsx`
 * (row 13) compiles against.
 */
export interface AccountGroupsScreenProps {
  grantedScopes: string[];
}

export function AccountGroupsScreen(_props: AccountGroupsScreenProps): JSX.Element {
  throw new Error('Not implemented — DRK-1697 Build stage (row 11).');
}
