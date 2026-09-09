import { NextResponse, type NextRequest } from 'next/server';
import { unseal } from './lib/auth/crypto';
import { authConfig } from './lib/auth/config';
import { sessionCookieName } from './lib/auth/session';
import type { AuthSession } from './lib/auth/types';
import { isAdminPath, isPublicPath } from './lib/route-policy';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname)) return NextResponse.next();
  try {
    const config = authConfig();
    const token = request.cookies.get(sessionCookieName(config.secureCookies))?.value;
    if (!token) return toLogin(request);
    const session = await unseal<AuthSession>(token, config.sessionSecret, 'risexpto:web-session');
    if (session.refreshExpiresAt <= Date.now()) return toLogin(request);
    if (isAdminPath(pathname) && !session.user.roles.includes('ADMIN'))
      return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  } catch {
    return toLogin(request);
  }
}
function toLogin(request: NextRequest) {
  const login = new URL('/login', request.url);
  login.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
