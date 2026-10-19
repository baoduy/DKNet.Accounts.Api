/**
 * DRK-2325 §5:
 *   @unit Scenario: The Transfers entry sits under LEDGER after Records
 *     ...
 *     And the Transfers screen's page trail reads Ledger / Transfers
 *
 * The page is a thin server component (brief §3 row 7, mirroring `app/records/page.tsx`): the
 * session reads it makes are stubbed here, and the trail and menu it hands `AppShell` are drawn.
 * The Records page runs through the same harness as its control — green today, it shows the
 * harness itself can read a trail.
 *
 * RED today on Transfers: `app/transfers/page.tsx` is a stub that throws.
 */
import { render, screen, within } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RecordsPage from '@/app/records/page';
import TransfersPage from '@/app/transfers/page';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'signed-session-cookie' }) }) }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirected to ${to}`);
  },
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/lib/config', () => ({ loadConfig: () => ({ sessionSecret: 'secret' }), getConfigMode: () => 'configured' }));
vi.mock('@/lib/crypto', () => ({ verifyCookieValue: () => 'session-1' }));
vi.mock('@/lib/session', () => ({
  SESSION_COOKIE_NAME: 'sessionId',
  getSession: async () => ({ sessionId: 'session-1', displayName: 'Mai', signInName: 'mai@example.test', tenantName: 'Example', directoryObjectId: 'oid-1' }),
}));
vi.mock('@/lib/token-store', () => ({ getAccessToken: async () => ({ accessToken: 'token' }) }));
vi.mock('@/lib/oidc', () => ({ scopesFromAccessToken: () => ['accounts.read', 'postings.read', 'postings.write'] }));

interface ShellProps {
  sidebar: ReactNode;
  breadcrumb: ReactNode;
}

async function shellOf(page: () => Promise<ReactElement>): Promise<ShellProps> {
  return (await page()).props as ShellProps;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("The Transfers screen's page trail reads Ledger / Transfers", () => {
  it('Records (harness control): the trail reads Ledger / Records and Records is the current entry', async () => {
    const shell = await shellOf(RecordsPage);

    render(<>{shell.breadcrumb}</>);
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(trail.textContent).toBe('Ledger/Records');
    expect(within(trail).getByRole('link', { name: 'Ledger' })).toHaveAttribute('href', '/');
    expect(within(trail).getByText('Records')).toHaveAttribute('aria-current', 'page');
  });

  it('Transfers: the trail reads Ledger / Transfers and Transfers is the current menu entry', async () => {
    const shell = await shellOf(TransfersPage);

    render(
      <>
        {shell.breadcrumb}
        {shell.sidebar}
      </>,
    );
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(trail.textContent).toBe('Ledger/Transfers');
    expect(within(trail).getByRole('link', { name: 'Ledger' })).toHaveAttribute('href', '/');
    expect(within(trail).getByText('Transfers')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Transfers' })).toHaveAttribute('aria-current', 'page');
  });
});
