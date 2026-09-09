import { describe, expect, it } from 'vitest';
import { resolveBinancePrivateBaseUrl } from './binance-environment.js';

describe('resolveBinancePrivateBaseUrl', () => {
  it('resolves only the configured Spot Testnet endpoint', () => {
    expect(
      resolveBinancePrivateBaseUrl({
        BINANCE_TRADING_ENVIRONMENT: 'TESTNET',
        BINANCE_TESTNET_BASE_URL: 'https://testnet.binance.vision',
      }),
    ).toBe('https://testnet.binance.vision');
  });

  it('fails closed when Production is selected', () => {
    expect(() =>
      resolveBinancePrivateBaseUrl({
        BINANCE_TRADING_ENVIRONMENT: 'PRODUCTION',
        BINANCE_PRODUCTION_BASE_URL: 'https://api.binance.com',
      }),
    ).toThrow('disabled');
  });

  it('rejects a production or custom endpoint under TESTNET', () => {
    expect(() =>
      resolveBinancePrivateBaseUrl({
        BINANCE_TRADING_ENVIRONMENT: 'TESTNET',
        BINANCE_TESTNET_BASE_URL: 'https://api.binance.com',
      }),
    ).toThrow('Testnet requires');
  });
});
