import { Injectable } from '@nestjs/common';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import jwksClient, { type JwksClient } from 'jwks-rsa';
import type { TokenVerifier, VerifiedClaims } from './auth.types';

export type TokenFailureReason =
  | 'MALFORMED'
  | 'ID_TOKEN'
  | 'AUDIENCE'
  | 'ISSUER'
  | 'EXPIRED'
  | 'SIGNATURE'
  | 'CLAIMS'
  | 'INVALID';

export type TokenClaimsDiagnostics = Readonly<{
  typ: string | null;
  subPresent: boolean;
  emailPresent: boolean;
  emailVerifiedPresent: boolean;
  audiences: string[];
  issuer: string | null;
  azp: string | null;
  scope: string | null;
  realmRolesPresent: boolean;
  expiration: number | null;
}>;

export class KeycloakTokenVerificationError extends Error {
  constructor(
    readonly reason: TokenFailureReason,
    readonly tokenKind: 'access' | 'id' | 'unknown' = 'unknown',
    cause?: unknown,
    readonly diagnostics?: TokenClaimsDiagnostics,
  ) {
    super(reason, { cause });
    this.name = 'KeycloakTokenVerificationError';
  }
}

@Injectable()
export class KeycloakJwtVerifier implements TokenVerifier {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly client: JwksClient;
  constructor() {
    const base = required(process.env.KEYCLOAK_URL, 'KEYCLOAK_URL').replace(/\/$/, '');
    const realm = required(process.env.KEYCLOAK_REALM, 'KEYCLOAK_REALM');
    this.issuer = `${base}/realms/${encodeURIComponent(realm)}`;
    this.audience = required(process.env.KEYCLOAK_API_AUDIENCE, 'KEYCLOAK_API_AUDIENCE');
    this.client = jwksClient({
      jwksUri: `${this.issuer}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600_000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      timeout: 5_000,
    });
  }
  async verify(token: string): Promise<VerifiedClaims> {
    const decoded = jwt.decode(token, { complete: true });
    const tokenKind =
      decoded && typeof decoded !== 'string' && typeof decoded.payload !== 'string'
        ? classifyTokenKind(decoded.header.typ, decoded.payload, this.audience)
        : 'unknown';
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid)
      throw new KeycloakTokenVerificationError('MALFORMED', tokenKind);
    const key = await this.client.getSigningKey(decoded.header.kid);
    let result: JwtPayload;
    try {
      result = jwt.verify(token, key.getPublicKey(), {
        algorithms: ['RS256'],
        audience: this.audience,
        issuer: this.issuer,
        clockTolerance: 5,
      }) as JwtPayload;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const reason = message.includes('audience')
        ? 'AUDIENCE'
        : message.includes('issuer')
          ? 'ISSUER'
          : message.includes('expired')
            ? 'EXPIRED'
            : message.includes('signature')
              ? 'SIGNATURE'
              : 'INVALID';
      throw new KeycloakTokenVerificationError(reason, tokenKind, error);
    }
    if (typeof result.sub !== 'string' || typeof result.email !== 'string') {
      const diagnostics = tokenClaimsDiagnostics(decoded.header.typ, result);
      if (process.env.NODE_ENV === 'development') {
        console.warn(JSON.stringify({ event: 'api_access_token_claims_diagnostics', diagnostics }));
      }
      throw new KeycloakTokenVerificationError('CLAIMS', tokenKind, undefined, diagnostics);
    }
    return result as VerifiedClaims;
  }
}

export function tokenClaimsDiagnostics(typ: unknown, claims: JwtPayload): TokenClaimsDiagnostics {
  const audience = Array.isArray(claims.aud)
    ? claims.aud.filter((value): value is string => typeof value === 'string')
    : typeof claims.aud === 'string'
      ? [claims.aud]
      : [];
  return {
    typ: typeof typ === 'string' ? typ : null,
    subPresent: typeof claims.sub === 'string',
    emailPresent: typeof claims.email === 'string',
    emailVerifiedPresent: claims.email_verified !== undefined,
    audiences: audience,
    issuer: typeof claims.iss === 'string' ? claims.iss : null,
    azp: typeof claims.azp === 'string' ? claims.azp : null,
    scope: typeof claims.scope === 'string' ? claims.scope : null,
    realmRolesPresent:
      typeof claims.realm_access === 'object' &&
      claims.realm_access !== null &&
      Array.isArray((claims.realm_access as { roles?: unknown }).roles),
    expiration: typeof claims.exp === 'number' ? claims.exp : null,
  };
}

export function classifyTokenKind(
  typ: unknown,
  payload: JwtPayload,
  apiAudience: string,
): 'access' | 'id' | 'unknown' {
  if (typ === 'ID') return 'id';
  if (typ === 'Bearer') return 'access';
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (audience.includes(apiAudience)) return 'access';
  if (typeof payload.azp === 'string' && payload.azp === process.env.KEYCLOAK_CLIENT_ID)
    return 'id';
  return 'unknown';
}
function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
