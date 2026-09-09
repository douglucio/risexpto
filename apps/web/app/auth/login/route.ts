import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '../../../lib/auth/config';
import { authorizationUrl, createLoginTransaction } from '../../../lib/auth/oidc';
import { writeTransaction } from '../../../lib/auth/session';

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  const requestedLocale = request.nextUrl.searchParams.get('locale');
  const locale = requestedLocale === 'pt-BR' || requestedLocale === 'es' || requestedLocale === 'en' ? requestedLocale : undefined;
  const transaction = createLoginTransaction(request.nextUrl.searchParams.get('returnTo') ?? '/dashboard', locale);
  await writeTransaction(transaction);
  return NextResponse.redirect(
    authorizationUrl(
      authConfig(),
      transaction,
      action === 'register' || action === 'recover' ? action : undefined,
    ),
  );
}
