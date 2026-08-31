import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { BinanceAccountConnection } from './client.js';
import { BinanceConnectionError } from './errors.js';
import { CredentialVault } from './vault.js';

const key = new Uint8Array(32).fill(7);
const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as Response;

describe('BinanceAccountConnection', () => {
  it('encrypts credentials, signs account requests, and never exposes secret', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(okResponse({ canTrade: true, canDeposit: true, canWithdraw: false }));
    const audit = vi.fn();
    const now = () => 1_700_000_000_000;
    const connection = new BinanceAccountConnection(
      new CredentialVault(key),
      'https://api.binance.test',
      { fetch: fetcher, now },
      audit,
    );
    const summary = connection.register('abcd12345678', 'secret-value');
    const stored = connection.storedCredentialsForPersistence();
    expect(summary.apiKeyMasked).toBe('abcd****5678');
    expect(stored?.apiSecretCiphertext).not.toContain('secret-value');
    await expect(connection.testConnection()).resolves.toMatchObject({
      status: 'CONNECTED',
      permissions: ['TRADE', 'DEPOSIT'],
    });
    const requestUrl = fetcher.mock.calls[0]?.[0];
    const url =
      requestUrl instanceof URL
        ? requestUrl.href
        : typeof requestUrl === 'string'
          ? requestUrl
          : requestUrl?.url;
    expect(url).toContain('timestamp=1700000000000');
    expect(url).toContain(
      `signature=${createHmac('sha256', 'secret-value').update('recvWindow=5000&timestamp=1700000000000').digest('hex')}`,
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: { 'X-MBX-APIKEY': 'abcd12345678' },
    });
  });

  it('marks invalid credentials, revokes locally, and rejects unsafe keys', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) } as Response);
    const connection = new BinanceAccountConnection(
      new CredentialVault(key),
      'https://api.binance.test',
      { fetch: fetcher },
    );
    connection.register('api-key', 'api-secret');
    await expect(connection.testConnection()).rejects.toThrow('validation failed');
    expect(connection.status().status).toBe('INVALID');
    connection.revoke();
    expect(connection.status().status).toBe('DISCONNECTED');
    expect(connection.storedCredentialsForPersistence()?.apiSecretCiphertext).toBe('');
    expect(() => new CredentialVault(new Uint8Array(8))).toThrow(BinanceConnectionError);
  });
});
