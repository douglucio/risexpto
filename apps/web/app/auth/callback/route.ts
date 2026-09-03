import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authConfig } from '../../../lib/auth/config';
import { exchangeCode, OidcFlowError } from '../../../lib/auth/oidc';
import { clearTransaction, readTransaction, writeSession } from '../../../lib/auth/session';

export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const transaction = await readTransaction();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const providerError = request.nextUrl.searchParams.get('error');
  if (providerError) {
    const reason = mapProviderError(providerError);
    logAuthFailure(correlationId, reason);
    await clearTransaction();
    return redirectWithError(request, reason, correlationId);
  }
  if (
    !transaction ||
    !code ||
    !state ||
    state !== transaction.state ||
    Date.now() - transaction.createdAt > 600_000
  ) {
    logAuthFailure(correlationId, 'INVALID_STATE_OR_PKCE');
    await clearTransaction();
    return redirectWithError(request, 'INVALID_STATE_OR_PKCE', correlationId);
  }
  try {
    const session = await exchangeCode(authConfig(), code, transaction.verifier);
    if (!session.user.emailVerified) {
      logAuthFailure(correlationId, 'EMAIL_NOT_VERIFIED');
      await clearTransaction();
      return redirectWithError(request, 'EMAIL_NOT_VERIFIED', correlationId);
    }
    await writeSession(session);
    await clearTransaction();
    return NextResponse.redirect(new URL(transaction.returnTo, request.url));
  } catch (error) {
    const reason = error instanceof OidcFlowError ? error.code : 'AUTHENTICATION_FAILED';
    logAuthFailure(correlationId, reason);
    await clearTransaction();
    return redirectWithError(request, reason, correlationId);
  }
}

function mapProviderError(error: string): string {
  if (error === 'expired_code') return 'CODE_EXPIRED';
  if (error === 'access_denied') return 'ACCESS_DENIED';
  if (error === 'invalid_scope') return 'INVALID_SCOPE';
  return 'PROVIDER_AUTHENTICATION_FAILED';
}

function redirectWithError(request: NextRequest, error: string, correlationId: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', error.toLowerCase());
  url.searchParams.set('ref', correlationId.slice(0, 8));
  return NextResponse.redirect(url);
}

function logAuthFailure(correlationId: string, reason: string): void {
  console.error(JSON.stringify({ event: 'web_authentication_failed', correlationId, reason }));
}
