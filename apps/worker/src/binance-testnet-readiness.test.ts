import { describe, expect, it } from 'vitest';
import { evaluateTestnetReadiness } from './binance-testnet-readiness.js';

describe('Binance Testnet readiness preflight', () => {
  it('fails closed for production and missing credentials', () => {
    const checks = evaluateTestnetReadiness({
      BINANCE_TRADING_ENVIRONMENT: 'PRODUCTION',
      BINANCE_TESTNET_BASE_URL: 'https://api.binance.com',
    });
    expect(checks.every((check) => check.ok)).toBe(false);
    expect(checks.find((check) => check.name === 'endpoint')?.ok).toBe(false);
    expect(checks.find((check) => check.name === 'api-secret')?.detail).toContain('missing');
  });

  it('passes configuration checks without exposing secret values', () => {
    const checks = evaluateTestnetReadiness({
      BINANCE_TRADING_ENVIRONMENT: 'TESTNET',
      BINANCE_TESTNET_BASE_URL: 'https://testnet.binance.vision',
      BINANCE_TESTNET_API_KEY: 'key',
      BINANCE_TESTNET_API_SECRET: 'secret',
      DATABASE_URL: 'postgresql://redacted',
      REDIS_URL: 'redis://redacted',
    });
    expect(checks.every((check) => check.ok)).toBe(true);
    expect(checks.map((check) => check.detail).join(' ')).not.toContain('secret');
    expect(checks.map((check) => check.detail).join(' ')).not.toContain('key');
  });
});
