import { describe, expect, it } from 'vitest';
import { runBacktest, type BacktestCandle } from './index.js';
const candles: BacktestCandle[] = [10, 12, 9, 13].map((close, i) => ({
  openTime: i,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
}));
describe('backtesting engine', () => {
  it('simulates fills and calculates returns, risk and trade metrics', () => {
    let n = 0;
    const result = runBacktest(100, candles, () =>
      ++n === 1 ? { side: 'BUY', quoteAmount: 50 } : n === 4 ? { side: 'SELL' } : null,
    );
    expect(result.metrics).toMatchObject({
      tradeCount: 1,
      estimatedFees: 0.115,
      bestTrade: 14.935,
    });
    expect(result.metrics.returnPercent).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('not a guarantee');
  });
  it('rejects unsafe input', () =>
    expect(() => runBacktest(0, candles, () => null)).toThrow('Invalid'));
});
