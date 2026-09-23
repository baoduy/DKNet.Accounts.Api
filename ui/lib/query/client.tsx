/**
 * DRK-1684 §3 row 7 — the TanStack Query provider every screen mounts under. Money-bearing
 * queries get `staleTime: 0` and refetch on mount and on window focus (R4); the currency
 * list is cheap to hold for the session (`staleTime: Infinity`).
 *
 * Mode: acceptance-tests (DRK-1684). Not implemented yet — Build turns
 * `33-a-figure-is-read-again-when-the-screen-showing-it-opens.spec.ts` and
 * `34-a-figure-is-read-again-when-the-console-comes-back-into-focus.spec.ts` green by
 * replacing this stub.
 */
'use client';

import type { JSX, ReactNode } from 'react';

export interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider(_props: QueryProviderProps): JSX.Element {
  throw new Error('Not implemented: DRK-1684 §3 row 7 — TanStack Query provider');
}
