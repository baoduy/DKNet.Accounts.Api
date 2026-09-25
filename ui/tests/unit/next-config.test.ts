/**
 * DRK-1734 B3 — the acceptance suite's `next dev` consoles keep every route they compiled.
 * By default `next dev` throws a route's bundle away after 60 s without a request and
 * compiles it again on the next visit, which landed inside a check's 8 s navigation budget.
 */
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER } from 'next/constants';
import { afterEach, describe, expect, test, vi } from 'vitest';
import config from '../../next.config';
import { defaultConsoleEnv } from '../support/fixtures';

const CONSOLE_PORT = 45123;

function stubConsoleEnv(): void {
  for (const [name, value] of Object.entries(defaultConsoleEnv(CONSOLE_PORT))) {
    if (name.startsWith('CONSOLE_') && value !== undefined) vi.stubEnv(name, value);
  }
}

describe('next.config for an acceptance console', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('a console the suite starts keeps every route it compiled', () => {
    stubConsoleEnv();

    const nextConfig = config(PHASE_DEVELOPMENT_SERVER);

    expect(nextConfig.onDemandEntries).toEqual({ maxInactiveAge: 86_400_000, pagesBufferLength: 100 });
    expect(nextConfig.distDir).toBe('.next-45123');
  });

  test('a production server keeps the defaults', () => {
    stubConsoleEnv();

    const nextConfig = config(PHASE_PRODUCTION_SERVER);

    expect(nextConfig.onDemandEntries).toBeUndefined();
    expect(nextConfig.distDir).toBeUndefined();
  });
});
