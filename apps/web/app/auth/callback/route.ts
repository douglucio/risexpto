import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '../../../lib/auth/config';
import { exchangeCode } from '../../../lib/auth/oidc';
import { clearTransaction, readTransaction, writeSession } from '../../../lib/auth/session';

export async function GET(request: NextRequest) {
  const transaction = await readTransaction();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (
    !transaction ||
    !code ||
    !state ||
    state !== transaction.state ||
    Date.now() - transaction.createdAt > 600_000
  ) {
    await clearTransaction();
    return NextResponse.redirect(new URL('/login?error=invalid_callback', request.url));
  }
  try {
    const session = await exchangeCode(authConfig(), code, transaction.verifier);
    if (!session.user.emailVerified) throw new Error('Email is not verified');
    await writeSession(session);
    await clearTransaction();
    return NextResponse.redirect(new URL(transaction.returnTo, request.url));
  } catch {
    await clearTransaction();
    return NextResponse.redirect(new URL('/login?error=authentication_failed', request.url));
  }
}
