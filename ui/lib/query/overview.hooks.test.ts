/** DRK-1760 §3 row 3 — `useListTotal` holds its last answer only when asked to. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useListTotal } from './overview';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The first read answers at once; every later one is held, so a changed read stays outstanding. */
function stubLedger(): void {
  let calls = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (calls++ === 0 ? Promise.resolve(new Response('{"totalItemCount":4}')) : new Promise<Response>(() => undefined))),
  );
}

describe('useListTotal', () => {
  it('draws nothing for a changed read until it answers, by default', async () => {
    stubLedger();
    const { result, rerender } = renderHook(({ fromDate }) => useListTotal('account-groups', { fromDate }, { enabled: true }), { wrapper, initialProps: { fromDate: 'a' } });
    await waitFor(() => expect(result.current.data).toBe(4));

    rerender({ fromDate: 'b' });

    await waitFor(() => expect(result.current.data).toBeUndefined());
  });

  it('keeps the last answer drawn while a changed read is outstanding, when asked to', async () => {
    stubLedger();
    const { result, rerender } = renderHook(({ fromDate }) => useListTotal('account-groups', { fromDate }, { enabled: true, keepPrevious: true }), {
      wrapper,
      initialProps: { fromDate: 'a' },
    });
    await waitFor(() => expect(result.current.data).toBe(4));

    rerender({ fromDate: 'b' });

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data).toBe(4);
  });
});
