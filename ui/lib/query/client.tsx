/**
 * DRK-1684 §3 row 7 — the TanStack Query provider every screen mounts under. Money-bearing
 * queries get `staleTime: 0` and refetch on mount and on window focus (R4); a query that
 * needs the currency list's cheaper lifetime (`staleTime: Infinity`) overrides it per-call.
 */
'use client';

import { useState, type JSX, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export interface QueryProviderProps {
  children: ReactNode;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: QueryProviderProps): JSX.Element {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
