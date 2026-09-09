import { describe, expect, it } from 'vitest';
import { authorizationUrl, createLoginTransaction, OidcFlowError, summarizeAccessToken } from './oidc';
import type { AuthConfig } from './config';

const config: AuthConfig = {
  issuer: 'https://id.example/realms/rise',
  clientId: 'web',
  apiAudience: 'api',
  baseUrl: 'https://app.example',
  sessionSecret: '0123456789abcdef0123456789abcdef',
  secureCookies: true,
};
describe('OIDC authorization', () => {
  const token = (payload: Record<string, unknown>) =>
    `${Buffer.from(JSON.stringify({ alg: 'RS256', typ: payload.typ })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

  it('summarizes access tokens without logging token contents', () => {
    expect(summarizeAccessToken(token({ typ: 'Bearer', aud: 'risexpto-api', iss: 'http://localhost:8080/realms/risexpto', exp: Math.floor(Date.now() / 1000) + 60 }))).toMatchObject({
      present: true,
      kind: 'access',
      audience: ['risexpto-api'],
      issuerHost: 'localhost:8080',
      expired: false,
    });
    expect(summarizeAccessToken(token({ typ: 'ID', aud: 'risexpto-web', iss: 'http://localhost:8080/realms/risexpto' })).kind).toBe('id');
  });
  it('uses authorization code with PKCE and state', () => {
    const transaction = createLoginTransaction('/bots?tab=active');
    const url = authorizationUrl(config, transaction);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe(transaction.state);
    expect(url.searchParams.get('code_challenge')).toHaveLength(43);
  });
  it('exposes a safe diagnostic for incomplete identity claims', () => {
    const error = new OidcFlowError('IDENTITY_CLAIMS_MISSING');
    expect(error.code).toBe('IDENTITY_CLAIMS_MISSING');
    expect(error.message).not.toContain('token');
  });
  it('prevents external return redirects', () => {
    expect(createLoginTransaction('https://evil.example').returnTo).toBe('/dashboard');
    expect(createLoginTransaction('//evil.example').returnTo).toBe('/dashboard');
  });
  it('uses the provider registration and required-action endpoints', () => {
    const transaction = createLoginTransaction('/');
    expect(authorizationUrl(config, transaction, 'register').pathname).toContain('/registrations');
    expect(authorizationUrl(config, transaction, 'recover').searchParams.get('kc_action')).toBe(
      'UPDATE_PASSWORD',
    );
  });
});
