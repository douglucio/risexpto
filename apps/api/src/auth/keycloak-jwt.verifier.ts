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

export class KeycloakTokenVerificationError extends Error {
  constructor(
    readonly reason: TokenFailureReason,
    readonly tokenKind: 'access' | 'id' | 'unknown' = 'unknown',
    cause?: unknown,
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
      decoded && typeof decoded !== 'string' && decoded.header.typ === 'ID'
        ? 'id'
        : decoded && typeof decoded !== 'string' && decoded.header.typ === 'Bearer'
          ? 'access'
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
    if (typeof result.sub !== 'string' || typeof result.email !== 'string')
      throw new KeycloakTokenVerificationError('CLAIMS', tokenKind);
    return result as VerifiedClaims;
  }
}
function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
