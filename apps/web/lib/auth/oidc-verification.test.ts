import { beforeEach, describe, expect, it, vi } from 'vitest';

const jwtVerifyMock = vi.hoisted(() => vi.fn());

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  decodeJwt: vi.fn(),
  decodeProtectedHeader: vi.fn(),
  jwtVerify: jwtVerifyMock,
}));

import { exchangeCode, OidcFlowError } from './oidc';

const config = {
  issuer: 'https://id.example/realms/rise',
  clientId: 'web',
  apiAudience: 'api',
  baseUrl: 'https://app.example',
  sessionSecret: '0123456789abcdef0123456789abcdef',
  secureCookies: true,
};

const accessClaims = { sub: 'user-1', email: 'user@example.com', email_verified: true };
const idClaims = { sub: 'user-1', email: 'user@example.com', email_verified: true };

describe('OIDC token verification', () => {
  beforeEach(() => {
    jwtVerifyMock.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          access_token: 'access',
          refresh_token: 'refresh',
          id_token: 'id',
          expires_in: 300,
          refresh_expires_in: 3600,
        }),
      }),
    );
  });

  it('accepts a valid access token and preserves the login locale', async () => {
    jwtVerifyMock
      .mockResolvedValueOnce({ payload: accessClaims })
      .mockResolvedValueOnce({ payload: idClaims });
    await expect(exchangeCode(config, 'code', 'verifier', 'pt-BR')).resolves.toMatchObject({
      user: { id: 'user-1', email: 'user@example.com' },
      preferences: { locale: 'pt-BR' },
    });
  });

  it('rejects missing email claims', async () => {
    jwtVerifyMock
      .mockResolvedValueOnce({ payload: { sub: 'user-1' } })
      .mockResolvedValueOnce({ payload: idClaims });
    await expect(exchangeCode(config, 'code', 'verifier')).rejects.toMatchObject({
      code: 'IDENTITY_CLAIMS_MISSING',
    });
  });

  it.each([
    ['wrong audience', 'unexpected aud claim', 'ACCESS_TOKEN_AUDIENCE_INVALID'],
    ['wrong issuer', 'unexpected iss claim', 'ACCESS_TOKEN_ISSUER_INVALID'],
    ['expired token', 'JWT expired', 'ACCESS_TOKEN_EXPIRED'],
  ] as const)('rejects %s', async (_label, message, code) => {
    jwtVerifyMock.mockRejectedValueOnce(new Error(message));
    await expect(exchangeCode(config, 'code', 'verifier')).rejects.toEqual(
      expect.objectContaining({ code }),
    );
  });

  it('rejects an ID token presented as the API bearer', async () => {
    jwtVerifyMock.mockRejectedValueOnce(new Error('unexpected aud claim in ID token'));
    const result = exchangeCode(config, 'code', 'verifier');
    await expect(result).rejects.toBeInstanceOf(OidcFlowError);
    expect(jwtVerifyMock).toHaveBeenCalledTimes(1);
    await expect(result).rejects.toMatchObject({
      code: 'ACCESS_TOKEN_AUDIENCE_INVALID',
    });
  });
});
