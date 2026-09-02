import { describe, expect, it } from 'vitest';
import {
  createTrendStrategy,
  evaluateTrendSignal,
  validateTrendParameters,
  type TrendCandle,
} from './index.js';

const parameters = {
  symbol: 'btcusdt',
  fastEmaPeriod: 3,
  slowEmaPeriod: 5,
  atrPeriod: 3,
  momentumPeriod: 2,
  minMomentumPercent: 0.5,
  minVolumeRatio: 1,
  maxAtrPercent: 10,
  quoteAmount: 100,
  maxCapital: 500,
};
const candles: TrendCandle[] = [10, 10.2, 10.4, 10.8, 11.2, 11.6, 12].map((close, index) => ({
  open: close - 0.1,
  high: close + 0.1,
  low: close - 0.2,
  close,
  volume: index === 6 ? 20 : 10,
  openTime: index,
}));

describe('Trend following strategy', () => {
  it('generates a deterministic PAPER buy after trend confirmation', () => {
    const strategy = createTrendStrategy('1.0.0', parameters);
    expect(evaluateTrendSignal(parameters, candles)).toBe('BUY');
    expect(
      strategy.analyze({ candles, spentCapital: 0, positionQuantity: 0, mode: 'PAPER' }),
    ).toEqual([expect.objectContaining({ side: 'BUY', symbol: 'BTCUSDT', quoteAmount: 100 })]);
  });
  it('exits a position on a bearish trend and never emits LIVE proposals', () => {
    const falling = candles.map((candle, index) => {
      const close = 12 - index * 0.4;
      return {
        ...candle,
        open: close + 0.1,
        high: close + 0.2,
        low: close - 0.1,
        close,
        volume: 10,
      };
    });
    const strategy = createTrendStrategy('1.0.0', parameters);
    expect(
      strategy.analyze({
        candles: falling,
        spentCapital: 100,
        positionQuantity: 2,
        mode: 'PAPER',
      })[0],
    ).toMatchObject({ side: 'SELL', quantity: 2 });
    expect(
      strategy.analyze({ candles, spentCapital: 0, positionQuantity: 0, mode: 'LIVE' }),
    ).toEqual([]);
  });
  it('holds when candles are insufficient or volatility is extreme', () => {
    expect(evaluateTrendSignal(parameters, candles.slice(0, 3))).toBe('HOLD');
    expect(evaluateTrendSignal({ ...parameters, maxAtrPercent: 0.01 }, candles)).toBe('HOLD');
  });
  it('rejects unsafe or overfitted parameter shapes', () => {
    expect(() => validateTrendParameters({ ...parameters, fastEmaPeriod: 5 })).toThrow(
      'Invalid Trend',
    );
    expect(() => validateTrendParameters({ ...parameters, maxCapital: 50 })).toThrow(
      'Invalid Trend',
    );
  });
});
