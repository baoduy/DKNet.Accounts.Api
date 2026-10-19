import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';
import { TransfersScreen } from '@/components/transfers/TransfersScreen';
import { AppShell } from '@/components/shell/AppShell';
import { Sidebar } from '@/components/shell/Sidebar';
import { TopBarSearch } from '@/components/shell/TopBarSearch';
import { UserMenu } from '@/components/shell/UserMenu';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { getConfigMode, loadConfig } from '@/lib/config';
import { verifyCookieValue } from '@/lib/crypto';
import { scopesFromAccessToken } from '@/lib/oidc';
import { KNOWN_SCOPES } from '@/lib/scopes';
import { getSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { getAccessToken } from '@/lib/token-store';
import NotConfiguredPage from '../not-configured/page';

// Reads live config and the session cookie on every request — never statically prerendered.
export const dynamic = 'force-dynamic';

/** `GET /transfers` — DRK-2325 §3 row 7, a thin server page mirroring `app/records/page.tsx`: session +
 * granted scopes, then `AppShell` around the client `TransfersScreen`. No fetching, no screen logic here.
 * The page header lives in `TransfersScreen`: its `Record transfer` action opens the screen's side panel. */
export default async function TransfersPage(): Promise<JSX.Element> {
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
      sidebar={<Sidebar active="transfers" />}
      breadcrumb={<Breadcrumb items={[{ label: 'Ledger', href: '/' }, { label: 'Transfers' }]} />}
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
      <Suspense>
        <TransfersScreen grantedScopes={grantedScopes} />
      </Suspense>
    </AppShell>
  );
}
