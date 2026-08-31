import { describe, expect, it } from 'vitest';
import { createDcaStrategy, validateDcaParameters } from './index.js';

const parameters = { symbol: 'btcusdt', intervalMs: 60_000, quoteAmount: 100, maxCapital: 500 };
const context = {
  now: 120_000,
  lastPurchaseAt: null,
  spentCapital: 0,
  price: 10_000,
  mode: 'PAPER' as const,
};

describe('DCA strategy', () => {
  it('creates a scheduled PAPER buy proposal', () => {
    const strategy = createDcaStrategy('1.0.0', parameters);
    expect(strategy.analyze(context)).toEqual([
      {
        side: 'BUY',
        symbol: 'BTCUSDT',
        quoteAmount: 100,
        strategyKey: 'dca',
        strategyVersion: '1.0.0',
        rationale: 'Scheduled DCA purchase at 10000',
      },
    ]);
  });
  it('does not propose outside interval, capital, price conditions or LIVE mode', () => {
    const strategy = createDcaStrategy('1.0.0', { ...parameters, minPrice: 11_000 });
    expect(strategy.analyze({ ...context, price: 10_000 })).toHaveLength(0);
    expect(strategy.analyze({ ...context, spentCapital: 450, price: 12_000 })).toHaveLength(0);
    expect(strategy.analyze({ ...context, lastPurchaseAt: 100_000, price: 12_000 })).toHaveLength(
      0,
    );
    expect(strategy.analyze({ ...context, mode: 'LIVE', price: 12_000 })).toHaveLength(0);
  });
  it('rejects unsafe parameters', () => {
    expect(() => validateDcaParameters({ ...parameters, maxCapital: 50 })).toThrow('Invalid DCA');
    expect(() => validateDcaParameters({ ...parameters, minPrice: 2, maxPrice: 1 })).toThrow(
      'price range',
    );
  });
});
