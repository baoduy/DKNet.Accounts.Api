import { NextResponse, type NextRequest } from 'next/server';
import { getConfigMode, loadConfig } from '@/lib/config';
import { beginSignIn } from '@/lib/oidc';

/** `GET /signin` — sends the operator to Microsoft Entra ID (DRK-1669 §3a). Anonymous. */
export async function GET(request: NextRequest): Promise<Response> {
  const config = loadConfig();
  if (getConfigMode(config) === 'notConfigured') {
    return NextResponse.redirect(new URL('/', config.baseUrl));
  }
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? undefined;
  const { redirectUrl } = await beginSignIn(returnTo);
  return NextResponse.redirect(redirectUrl);
}
