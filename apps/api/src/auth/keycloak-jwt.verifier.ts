import { Injectable } from '@nestjs/common';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import jwksClient, { type JwksClient } from 'jwks-rsa';
import type { TokenVerifier, VerifiedClaims } from './auth.types';

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
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid)
      throw new Error('Malformed token');
    const key = await this.client.getSigningKey(decoded.header.kid);
    const result = jwt.verify(token, key.getPublicKey(), {
      algorithms: ['RS256'],
      audience: this.audience,
      issuer: this.issuer,
      clockTolerance: 5,
    }) as JwtPayload;
    if (typeof result.sub !== 'string' || typeof result.email !== 'string')
      throw new Error('Required claims missing');
    return result as VerifiedClaims;
  }
}
function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
