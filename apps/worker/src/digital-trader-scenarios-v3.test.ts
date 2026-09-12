import { describe, expect, it } from 'vitest';
import { createDcaStrategy } from '@risexpto/strategy-dca';
import { buildGridOrders } from '@risexpto/strategy-grid';
import { createTrendStrategy } from '@risexpto/strategy-trend';
import { analyzeBreakout } from '@risexpto/strategy-breakout';

describe('Digital Trader Runtime V3 deterministic scenarios', () => {
  it('DCA buys only after its acquisition interval and capital ceiling', () => {
    const strategy = createDcaStrategy('1.0.0', { symbol: 'SOLUSDT', intervalMs: 60_000, quoteAmount: 100, maxCapital: 200 });
    expect(strategy.analyze({ now: 100_000, lastPurchaseAt: null, spentCapital: 0, price: 100, mode: 'PAPER' })).toHaveLength(1);
    expect(strategy.analyze({ now: 100_001, lastPurchaseAt: 50_000, spentCapital: 0, price: 100, mode: 'PAPER' })).toHaveLength(0);
    expect(strategy.analyze({ now: 100_000, lastPurchaseAt: null, spentCapital: 200, price: 100, mode: 'PAPER' })).toHaveLength(0);
  });

  it('Atlas assigns sides by price around the reference and produces partial-sized sell inventory', () => {
    const orders = buildGridOrders({ symbol: 'BTCUSDT', lowerPrice: 90, upperPrice: 110, levels: 5, capital: 1_000, maxVolatility: 100, referencePrice: 100 }, { price: 100, volatility: 0, availableBalance: 1_000, mode: 'PAPER' });
    expect(orders.filter((order) => order.side === 'BUY').map((order) => order.price)).toEqual([90, 95]);
    expect(orders.filter((order) => order.side === 'SELL').map((order) => order.price)).toEqual([100, 105, 110]);
    expect(orders.every((order) => order.quoteAmount === 200)).toBe(true);
  });

  it('Luna and Pulse expose deterministic entry/exit signals from the shared engines', () => {
    const candles = Array.from({ length: 30 }, (_, index) => ({ open: 100 + index, high: 101 + index, low: 99 + index, close: 100 + index, volume: 100, openTime: index }));
    const luna = createTrendStrategy('1.0.0', { symbol: 'ETHUSDT', fastEmaPeriod: 3, slowEmaPeriod: 8, atrPeriod: 3, momentumPeriod: 3, minMomentumPercent: 0, minVolumeRatio: 0.1, maxAtrPercent: 10, quoteAmount: 100, maxCapital: 1_000 });
    expect(luna.analyze({ candles, spentCapital: 0, positionQuantity: 0, mode: 'PAPER' })[0]?.side).toBe('BUY');
    const reversal = [...candles.slice(0, 20), ...Array.from({ length: 10 }, (_, index) => ({ open: 120 - index * 3, high: 121 - index * 3, low: 119 - index * 3, close: 120 - index * 3, volume: 100, openTime: 20 + index }))];
    expect(luna.analyze({ candles: reversal, spentCapital: 100, positionQuantity: 1, mode: 'PAPER' })[0]?.side).toBe('SELL');
    const pulse = { symbol: 'DOGEUSDT', lookback: 3, breakoutPercent: 1, quoteAmount: 100, maxCapital: 1_000, cooldownMs: 0, stopLossPercent: 3, takeProfitPercent: 6 };
    expect(analyzeBreakout(pulse, { now: 10, candles: [{ high: 101, low: 99, close: 100, volume: 10, openTime: 1 }, { high: 102, low: 100, close: 101, volume: 10, openTime: 2 }, { high: 103, low: 101, close: 102, volume: 10, openTime: 3 }, { high: 110, low: 102, close: 108, volume: 20, openTime: 4 }], spentCapital: 0, lastTradeAt: null, mode: 'PAPER' })).toMatchObject({ proposals: [{ side: 'BUY' }] });
    expect(analyzeBreakout(pulse, { now: 10, candles, spentCapital: 100, lastTradeAt: null, positionQuantity: 1, averageEntryPrice: 100, mode: 'PAPER' })).toMatchObject({ proposals: [{ side: 'SELL' }] });
  });
});
