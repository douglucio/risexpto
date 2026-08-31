import { describe, expect, it } from 'vitest';
import { authorizationUrl, createLoginTransaction } from './oidc';
import type { AuthConfig } from './config';

const config: AuthConfig = {
  issuer: 'https://id.example/realms/rise',
  clientId: 'web',
  baseUrl: 'https://app.example',
  sessionSecret: '0123456789abcdef0123456789abcdef',
  secureCookies: true,
};
describe('OIDC authorization', () => {
  it('uses authorization code with PKCE and state', () => {
    const transaction = createLoginTransaction('/bots?tab=active');
    const url = authorizationUrl(config, transaction);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe(transaction.state);
    expect(url.searchParams.get('code_challenge')).toHaveLength(43);
  });
  it('prevents external return redirects', () => {
    expect(createLoginTransaction('https://evil.example').returnTo).toBe('/');
    expect(createLoginTransaction('//evil.example').returnTo).toBe('/');
  });
  it('uses the provider registration and required-action endpoints', () => {
    const transaction = createLoginTransaction('/');
    expect(authorizationUrl(config, transaction, 'register').pathname).toContain('/registrations');
    expect(authorizationUrl(config, transaction, 'recover').searchParams.get('kc_action')).toBe(
      'UPDATE_PASSWORD',
    );
  });
});
