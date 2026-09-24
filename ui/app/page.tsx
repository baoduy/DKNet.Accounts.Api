import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';
import { OverviewScreen } from '@/components/overview/OverviewScreen';
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
 * `GET /` — the Overview screen (DRK-1728 §3 row 5). Anonymous visitors (and a
 * `notConfigured` console) are redirected before this component would render any
 * screen data (DRK-1669 §3a). Overview draws its own search field, so the top bar carries
 * none here — one search per screen (brief Q4).
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
        <UserMenu
          name={session.displayName}
          email={session.signInName}
          tenant={session.tenantName}
          scopes={grantedScopes}
          missingScopes={missingScopes}
          objectId={session.directoryObjectId}
        />
      }
    >
      <PageHeader title="Overview" description="Find any record, and read the figures the service counts." />
      <OverviewScreen grantedScopes={grantedScopes} directoryObjectId={session.directoryObjectId} />
    </AppShell>
  );
}
