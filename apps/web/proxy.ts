import { NextResponse, type NextRequest } from 'next/server';
import { unseal } from './lib/auth/crypto';
import { authConfig } from './lib/auth/config';
import { sessionCookieName } from './lib/auth/session';
import type { AuthSession } from './lib/auth/types';

export async function proxy(request: NextRequest) {
  try {
    const config = authConfig();
    const token = request.cookies.get(sessionCookieName(config.secureCookies))?.value;
    if (!token) return toLogin(request);
    const session = await unseal<AuthSession>(token, config.sessionSecret, 'risexpto:web-session');
    if (session.refreshExpiresAt <= Date.now()) return toLogin(request);
    if (request.nextUrl.pathname.startsWith('/admin') && !session.user.roles.includes('ADMIN'))
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
export const config = { matcher: ['/((?!login|auth|_next/static|_next/image|favicon.ico).*)'] };
