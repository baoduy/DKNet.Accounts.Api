import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';
import { AccountDetailScreen } from '@/components/accounts/AccountDetailScreen';
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
import NotConfiguredPage from '../../not-configured/page';

// Reads live config and the session cookie on every request — never statically prerendered.
export const dynamic = 'force-dynamic';

interface AccountDetailPageProps {
  params: Promise<{ account: string }>;
}

/** `GET /accounts/{account}` — a thin server page: session + granted scopes, then `AppShell`
 * around the client `AccountDetailScreen`. No fetching, no screen logic here (R6). The page header
 * lives in `AccountDetail`: its actions and description need the account and open its side panel. */
export default async function AccountDetailPage({ params }: AccountDetailPageProps): Promise<JSX.Element> {
  const config = loadConfig();
  if (getConfigMode(config) === 'notConfigured') {
    return <NotConfiguredPage />;
  }

  const { account: accountNumber } = await params;

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
      sidebar={<Sidebar active="accounts" />}
      breadcrumb={<Breadcrumb items={[{ label: 'Ledger', href: '/' }, { label: 'Accounts', href: '/accounts' }, { label: accountNumber }]} />}
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
        <AccountDetailScreen accountNumber={accountNumber} grantedScopes={grantedScopes} directoryObjectId={session.directoryObjectId} />
      </Suspense>
    </AppShell>
  );
}
