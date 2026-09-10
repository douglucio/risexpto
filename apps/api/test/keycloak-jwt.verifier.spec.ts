import { describe, expect, it } from 'vitest';
import { tokenClaimsDiagnostics } from '../src/auth/keycloak-jwt.verifier';

describe('token claims diagnostics', () => {
  it('reports claim presence without exposing token contents', () => {
    const diagnostics = tokenClaimsDiagnostics('Bearer', {
      sub: 'user-1',
      email_verified: true,
      aud: ['risexpto-api'],
      iss: 'http://localhost:8080/realms/risexpto',
      azp: 'risexpto-web',
      scope: 'openid profile email',
      realm_access: { roles: ['USER'] },
      exp: 2_000_000_000,
    });

    expect(diagnostics).toEqual({
      typ: 'Bearer',
      subPresent: true,
      emailPresent: false,
      emailVerifiedPresent: true,
      audiences: ['risexpto-api'],
      issuer: 'http://localhost:8080/realms/risexpto',
      azp: 'risexpto-web',
      scope: 'openid profile email',
      realmRolesPresent: true,
      expiration: 2_000_000_000,
    });
    expect(JSON.stringify(diagnostics)).not.toContain('secret');
  });
});
