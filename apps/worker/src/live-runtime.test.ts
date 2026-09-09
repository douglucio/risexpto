import { describe, expect, it, afterEach } from 'vitest';
import { assertTestnetLiveEnabled } from './live-runtime.js';

const originalEnvironment = process.env.BINANCE_TRADING_ENVIRONMENT;
const originalEnabled = process.env.LIVE_TRADING_ENABLED;

afterEach(() => {
  if (originalEnvironment === undefined) delete process.env.BINANCE_TRADING_ENVIRONMENT;
  else process.env.BINANCE_TRADING_ENVIRONMENT = originalEnvironment;
  if (originalEnabled === undefined) delete process.env.LIVE_TRADING_ENABLED;
  else process.env.LIVE_TRADING_ENABLED = originalEnabled;
});

describe('live runtime safety gate', () => {
  it('rejects production environment before enabling execution', () => {
    process.env.BINANCE_TRADING_ENVIRONMENT = 'PRODUCTION';
    process.env.LIVE_TRADING_ENABLED = 'true';
    expect(() => assertTestnetLiveEnabled()).toThrow('TESTNET');
  });

  it('rejects Testnet execution unless explicitly armed', () => {
    process.env.BINANCE_TRADING_ENVIRONMENT = 'TESTNET';
    process.env.LIVE_TRADING_ENABLED = 'false';
    expect(() => assertTestnetLiveEnabled()).toThrow('disabled');
  });
});
