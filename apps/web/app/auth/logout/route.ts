import { NextResponse } from 'next/server';
import { authConfig } from '../../../lib/auth/config';
import { logoutUrl } from '../../../lib/auth/oidc';
import { clearSession } from '../../../lib/auth/session';

export async function POST(request: Request) {
  const config = authConfig();
  if (request.headers.get('origin') !== config.baseUrl)
    return new NextResponse(null, { status: 403 });
  await clearSession();
  return NextResponse.redirect(logoutUrl(config), 303);
}
