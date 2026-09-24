import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';
import { RecordsScreen } from '@/components/records/RecordsScreen';
import { AppShell } from '@/components/shell/AppShell';
import { PageHeader } from '@/components/shell/PageHeader';
import { Sidebar } from '@/components/shell/Sidebar';
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

/** `GET /records` — a thin server page mirroring `app/accounts/page.tsx`: session + granted scopes,
 * then `AppShell` around the client `RecordsScreen`. No fetching, no screen logic here (DRK-1713 §3 row 8). */
export default async function RecordsPage(): Promise<JSX.Element> {
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
      sidebar={<Sidebar active="records" />}
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
      <PageHeader title="Records" description="Postings across every account: narrow, search, record and reverse." />
      <Suspense>
        <RecordsScreen grantedScopes={grantedScopes} />
      </Suspense>
    </AppShell>
  );
}
