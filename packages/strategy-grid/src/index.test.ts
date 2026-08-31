import { describe, expect, it } from 'vitest';
import { buildGridOrders, validateGridParameters } from './index.js';
const p = {
  symbol: 'BTCUSDT',
  lowerPrice: 9000,
  upperPrice: 11000,
  levels: 5,
  capital: 500,
  maxVolatility: 0.1,
};
describe('Grid strategy', () => {
  it('builds deterministic paper grid levels', () => {
    const o = buildGridOrders(p, {
      price: 10000,
      volatility: 0.05,
      availableBalance: 500,
      mode: 'PAPER',
    });
    expect(o).toHaveLength(5);
    expect(o[0]).toMatchObject({ side: 'BUY', price: 9000, quoteAmount: 100 });
    expect(o[4]?.price).toBe(11000);
  });
  it('stops on volatility, balance or live mode', () => {
    expect(
      buildGridOrders(p, { price: 1, volatility: 0.2, availableBalance: 500, mode: 'PAPER' }),
    ).toHaveLength(0);
    expect(
      buildGridOrders(p, { price: 1, volatility: 0.01, availableBalance: 1, mode: 'PAPER' }),
    ).toHaveLength(0);
    expect(
      buildGridOrders(p, { price: 1, volatility: 0.01, availableBalance: 500, mode: 'LIVE' }),
    ).toHaveLength(0);
  });
  it('rejects invalid range and levels', () => {
    expect(() => validateGridParameters({ ...p, upperPrice: 8000 })).toThrow('Invalid Grid');
    expect(() => validateGridParameters({ ...p, levels: 1 })).toThrow('Invalid Grid');
  });
});
