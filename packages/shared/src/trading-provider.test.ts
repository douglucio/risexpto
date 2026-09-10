import { describe, expect, it } from 'vitest';
import { tradingProvider, tradingProviders } from './trading-provider.js';

describe('trading provider registry', () => {
  it('exposes only Binance as operational in this MVP', () => {
    expect(tradingProvider('binance')).toMatchObject({ status: 'AVAILABLE', enabled: true });
    expect(
      tradingProviders
        .filter((provider) => provider.status === 'AVAILABLE')
        .map((provider) => provider.slug),
    ).toEqual(['binance']);
    expect(tradingProvider('bybit')).toMatchObject({ status: 'COMING_SOON', enabled: false });
  });
});
