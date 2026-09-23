import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Sidebar } from '@/components/shell/Sidebar';
import { AppShell } from '@/components/shell/AppShell';
import { UserMenu } from '@/components/shell/UserMenu';
import { getConfigMode, loadConfig } from '@/lib/config';
import { verifyCookieValue } from '@/lib/crypto';
import { scopesFromAccessToken } from '@/lib/oidc';
import { KNOWN_SCOPES } from '@/lib/scopes';
import { getSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { getAccessToken } from '@/lib/token-store';
import NotConfiguredPage from './not-configured/page';

// Reads live config and the session cookie on every request — never statically prerendered.
export const dynamic = 'force-dynamic';

/**
 * `GET /` — the framed console shell, no screen content. Anonymous visitors (and a
 * `notConfigured` console) are redirected before this component would render any
 * screen data (DRK-1669 §3a).
 */
export default async function ConsoleHome(): Promise<JSX.Element> {
  const config = loadConfig();
  if (getConfigMode(config) === 'notConfigured') {
    return <NotConfiguredPage />;
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionId = raw ? verifyCookieValue(config.sessionSecret, raw) : null;
  const session = sessionId ? await getSession(sessionId) : null;
  if (!session) {
    redirect('/signin');
  }

  const cachedToken = await getAccessToken(session.sessionId);
  const grantedScopes = cachedToken ? scopesFromAccessToken(cachedToken.accessToken) : [];
  const missingScopes = KNOWN_SCOPES.filter((scope) => !grantedScopes.includes(scope));

  return (
    <AppShell
      sidebar={<Sidebar active="overview" />}
      topbarRight={
        <>
          <div role="search">
            <input
              aria-label="Search"
              placeholder="Search"
              style={{
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'var(--border-control)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2)',
              }}
            />
          </div>
          <UserMenu
            name={session.displayName}
            email={session.signInName}
            tenant={session.tenantName}
            scopes={grantedScopes}
            missingScopes={missingScopes}
            objectId={session.directoryObjectId}
          />
        </>
      }
    >
      <PageHeader title="Console" description="No screens are wired to data yet." />
    </AppShell>
  );
}
