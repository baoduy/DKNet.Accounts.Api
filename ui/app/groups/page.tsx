import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';
import { AccountGroupsScreen } from '@/components/admin/AccountGroupsScreen';
import { AppShell } from '@/components/shell/AppShell';
import { PageHeader } from '@/components/shell/PageHeader';
import { Sidebar } from '@/components/shell/Sidebar';
import { TopBarSearch } from '@/components/shell/TopBarSearch';
import { UserMenu } from '@/components/shell/UserMenu';
import { getConfigMode, loadConfig } from '@/lib/config';
import { verifyCookieValue } from '@/lib/crypto';
import { scopesFromAccessToken } from '@/lib/oidc';
import { KNOWN_SCOPES } from '@/lib/scopes';
import { getSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { getAccessToken } from '@/lib/token-store';
import NotConfiguredPage from '../not-configured/page';

// Reads live config and the session cookie on every request — never statically prerendered.
export const dynamic = 'force-dynamic';

/**
 * `GET /groups` — DRK-1697 §3 row 13, a thin server wrapper: session + config check,
 * `AppShell` + the screen, as `app/page.tsx:24`. No screen logic lives here.
 */
export default async function GroupsPage(): Promise<JSX.Element> {
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
      sidebar={<Sidebar active="groups" />}
      topbarRight={
        <>
          <TopBarSearch grantedScopes={grantedScopes} />
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
      <PageHeader title="Account groups" description="Organise every account and its number prefix." />
      <AccountGroupsScreen grantedScopes={grantedScopes} directoryObjectId={session.directoryObjectId} />
    </AppShell>
  );
}
