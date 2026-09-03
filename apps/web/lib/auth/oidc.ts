import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from 'jose';
import type { AuthConfig } from './config';
import { roles, type AppRole, type AuthSession, type LoginTransaction } from './types';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_in: number;
  refresh_expires_in: number;
};

export type OidcFailureCode =
  | 'TOKEN_EXCHANGE_FAILED'
  | 'ACCESS_TOKEN_AUDIENCE_INVALID'
  | 'ACCESS_TOKEN_ISSUER_INVALID'
  | 'ACCESS_TOKEN_EXPIRED'
  | 'ID_TOKEN_INVALID'
  | 'IDENTITY_CLAIMS_MISSING'
  | 'TOKEN_INVALID';

export class OidcFlowError extends Error {
  constructor(
    readonly code: OidcFailureCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = 'OidcFlowError';
  }
}

export function createLoginTransaction(returnTo: string): LoginTransaction {
  return {
    state: randomBytes(24).toString('base64url'),
    verifier: randomBytes(48).toString('base64url'),
    returnTo: safeReturnTo(returnTo),
    createdAt: Date.now(),
  };
}
export function authorizationUrl(
  config: AuthConfig,
  transaction: LoginTransaction,
  action?: 'register' | 'recover',
): URL {
  const endpoint = action === 'register' ? 'registrations' : 'auth';
  const url = new URL(`${config.issuer}/protocol/openid-connect/${endpoint}`);
  const challenge = createHash('sha256').update(transaction.verifier).digest('base64url');
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${config.baseUrl}/auth/callback`,
    response_type: 'code',
    // The imported Keycloak client already has the `roles` client scope as a
    // default scope. Requesting it explicitly makes Keycloak reject the
    // authorization request in some local realm configurations.
    scope: 'openid profile email',
    state: transaction.state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  if (action === 'recover') url.searchParams.set('kc_action', 'UPDATE_PASSWORD');
  return url;
}
export async function exchangeCode(
  config: AuthConfig,
  code: string,
  verifier: string,
): Promise<AuthSession> {
  const tokens = await tokenRequest(config, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${config.baseUrl}/auth/callback`,
    code_verifier: verifier,
    client_id: config.clientId,
  });
  return sessionFromTokens(config, tokens);
}
export async function refreshSession(
  config: AuthConfig,
  session: AuthSession,
): Promise<AuthSession> {
  const tokens = await tokenRequest(config, {
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
    client_id: config.clientId,
  });
  return sessionFromTokens(config, tokens);
}
async function tokenRequest(
  config: AuthConfig,
  params: Record<string, string>,
): Promise<TokenResponse> {
  const response = await fetch(`${config.issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new OidcFlowError('TOKEN_EXCHANGE_FAILED');
  return response.json() as Promise<TokenResponse>;
}
async function sessionFromTokens(config: AuthConfig, tokens: TokenResponse): Promise<AuthSession> {
  const access = await verify(config, tokens.access_token, config.apiAudience, 'access');
  const identity = tokens.id_token
    ? await verify(config, tokens.id_token, config.clientId, 'id')
    : access;
  const realmRoles = ((access.realm_access as { roles?: unknown } | undefined)?.roles ??
    []) as unknown;
  const assigned = Array.isArray(realmRoles)
    ? realmRoles.filter(
        (role): role is AppRole => typeof role === 'string' && roles.includes(role as AppRole),
      )
    : [];
  if (!identity.sub || typeof identity.email !== 'string')
    throw new OidcFlowError('IDENTITY_CLAIMS_MISSING');
  return {
    user: {
      id: identity.sub,
      email: identity.email,
      name: typeof identity.name === 'string' ? identity.name : identity.email,
      emailVerified: identity.email_verified === true,
      roles: assigned,
    },
    preferences: { locale: 'en', timezone: 'UTC', currency: 'USD' },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessExpiresAt: Date.now() + tokens.expires_in * 1000,
    refreshExpiresAt: Date.now() + tokens.refresh_expires_in * 1000,
  };
}
async function verify(
  config: AuthConfig,
  token: string,
  audience: string,
  tokenKind: 'access' | 'id',
): Promise<JWTPayload> {
  const jwks = createRemoteJWKSet(new URL(`${config.issuer}/protocol/openid-connect/certs`));
  try {
    return (
      await jwtVerify(token, jwks, { issuer: config.issuer, audience, algorithms: ['RS256'] })
    ).payload;
  } catch (error) {
    if (tokenKind === 'access' && error instanceof Error && error.message.includes('aud'))
      throw new OidcFlowError('ACCESS_TOKEN_AUDIENCE_INVALID', error);
    if (tokenKind === 'access' && error instanceof Error && error.message.includes('iss'))
      throw new OidcFlowError('ACCESS_TOKEN_ISSUER_INVALID', error);
    if (
      error instanceof Error &&
      (error.message.includes('exp') || error.message.includes('expired'))
    )
      throw new OidcFlowError('ACCESS_TOKEN_EXPIRED', error);
    if (tokenKind === 'id') throw new OidcFlowError('ID_TOKEN_INVALID', error);
    throw new OidcFlowError('TOKEN_INVALID', error);
  }
}
export function logoutUrl(config: AuthConfig): URL {
  const url = new URL(`${config.issuer}/protocol/openid-connect/logout`);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('post_logout_redirect_uri', `${config.baseUrl}/login`);
  return url;
}
export function unsafeTokenExpiry(token: string): number | undefined {
  return decodeJwt(token).exp;
}
function safeReturnTo(value: string): string {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
