import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';
import { QueryProvider } from './client';

function DefaultOptionsProbe(): JSX.Element {
  const client = useQueryClient();
  const defaults = client.getDefaultOptions().queries ?? {};
  return (
    <pre>
      {JSON.stringify({ staleTime: defaults.staleTime, refetchOnMount: defaults.refetchOnMount, refetchOnWindowFocus: defaults.refetchOnWindowFocus, retry: defaults.retry })}
    </pre>
  );
}

describe('QueryProvider', () => {
  it('defaults money-bearing queries to refetch on mount and on window focus, never stale-cached, never retried', () => {
    render(
      <QueryProvider>
        <DefaultOptionsProbe />
      </QueryProvider>,
    );
    expect(
      screen.getByText(JSON.stringify({ staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true, retry: false })),
    ).toBeInTheDocument();
  });

  it('renders its children', () => {
    render(
      <QueryProvider>
        <div>child content</div>
      </QueryProvider>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
