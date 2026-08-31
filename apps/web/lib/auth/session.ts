import { cookies } from 'next/headers';
import { authConfig } from './config';
import { seal, unseal } from './crypto';
import { refreshSession } from './oidc';
import type { AuthSession, LoginTransaction, UserPreferences } from './types';

export const sessionCookieName = (secure: boolean) => (secure ? '__Host-rx-session' : 'rx-session');
const transactionCookieName = (secure: boolean) => (secure ? '__Host-rx-oidc' : 'rx-oidc');
const sessionAudience = 'risexpto:web-session';
const transactionAudience = 'risexpto:oidc-transaction';
export async function writeTransaction(transaction: LoginTransaction): Promise<void> {
  const config = authConfig();
  const jar = await cookies();
  jar.set(
    transactionCookieName(config.secureCookies),
    await seal(transaction, config.sessionSecret, 600, transactionAudience),
    cookieOptions(config.secureCookies, 600),
  );
}
export async function readTransaction(): Promise<LoginTransaction | null> {
  const config = authConfig();
  const token = (await cookies()).get(transactionCookieName(config.secureCookies))?.value;
  if (!token) return null;
  try {
    return await unseal<LoginTransaction>(token, config.sessionSecret, transactionAudience);
  } catch {
    return null;
  }
}
export async function clearTransaction(): Promise<void> {
  const config = authConfig();
  (await cookies()).delete(transactionCookieName(config.secureCookies));
}
export async function writeSession(session: AuthSession): Promise<void> {
  const config = authConfig();
  const maxAge = Math.max(1, Math.floor((session.refreshExpiresAt - Date.now()) / 1000));
  (await cookies()).set(
    sessionCookieName(config.secureCookies),
    await seal(session, config.sessionSecret, maxAge, sessionAudience),
    cookieOptions(config.secureCookies, maxAge),
  );
}
export async function readSession(refresh = true): Promise<AuthSession | null> {
  const config = authConfig();
  const token = (await cookies()).get(sessionCookieName(config.secureCookies))?.value;
  if (!token) return null;
  try {
    const session = await unseal<AuthSession>(token, config.sessionSecret, sessionAudience);
    if (session.refreshExpiresAt <= Date.now()) return null;
    if (refresh && session.accessExpiresAt <= Date.now() + 60_000) {
      const next = await refreshSession(config, session);
      await writeSession({ ...next, preferences: session.preferences });
      return { ...next, preferences: session.preferences };
    }
    return session;
  } catch {
    return null;
  }
}
export async function clearSession(): Promise<void> {
  const config = authConfig();
  (await cookies()).delete(sessionCookieName(config.secureCookies));
}
export async function updatePreferences(preferences: UserPreferences): Promise<AuthSession | null> {
  const session = await readSession();
  if (!session) return null;
  const next = { ...session, preferences };
  await writeSession(next);
  return next;
}
function cookieOptions(secure: boolean, maxAge: number) {
  return { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge };
}
