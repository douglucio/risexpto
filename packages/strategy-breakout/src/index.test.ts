import { describe, expect, it } from 'vitest';
import { analyzeBreakout } from './index.js';

const candles = (lastClose: number) => [1, 2, 3].map((value) => ({ high: value * 10, low: value * 9, close: value * 10, volume: 100, openTime: value })).concat({ high: lastClose, low: lastClose - 1, close: lastClose, volume: 200, openTime: 4 });
describe('breakout strategy', () => {
  const parameters = { symbol: 'BTCUSDT', lookback: 3, breakoutPercent: 1, quoteAmount: 10, maxCapital: 100, cooldownMs: 60_000 };
  it('stays Paper-only and returns structured waiting reasons', () => expect(analyzeBreakout(parameters, { now: 0, candles: [], spentCapital: 0, lastTradeAt: null, mode: 'LIVE' })).toMatchObject({ kind: 'NO_OP', waitingReason: 'OUTSIDE_SCHEDULE' }));
  it('generates a paper proposal only after range expansion', () => expect(analyzeBreakout(parameters, { now: 100_000, candles: candles(40), spentCapital: 0, lastTradeAt: null, mode: 'PAPER' })).toMatchObject({ proposals: [{ side: 'BUY', symbol: 'BTCUSDT' }] }));
});
