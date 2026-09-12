import { noOp, type StrategyNoOp } from '@risexpto/digital-traders';

export type BreakoutParameters = Readonly<{ symbol: string; lookback: number; breakoutPercent: number; quoteAmount: number; maxCapital: number; cooldownMs: number; stopLossPercent?: number; takeProfitPercent?: number }>;
export type BreakoutCandle = Readonly<{ high: number; low: number; close: number; volume: number; openTime: number }>;
export type BreakoutContext = Readonly<{ now: number; candles: readonly BreakoutCandle[]; spentCapital: number; lastTradeAt: number | null; positionQuantity?: number; averageEntryPrice?: number; mode: 'PAPER' | 'LIVE' }>;
export type BreakoutProposal = Readonly<{ side: 'BUY' | 'SELL'; symbol: string; quoteAmount?: number; quantity?: number; rationale: string }>;
export type BreakoutResult = Readonly<{ proposals: readonly [BreakoutProposal] } | StrategyNoOp>;

export function validateBreakoutParameters(value: unknown): BreakoutParameters {
  if (!value || typeof value !== 'object') throw new Error('Breakout parameters are required');
  const p = value as Partial<BreakoutParameters>;
  const symbol = p.symbol;
  const lookback = p.lookback;
  const breakoutPercent = p.breakoutPercent;
  const quoteAmount = p.quoteAmount;
  const maxCapital = p.maxCapital;
  const cooldownMs = p.cooldownMs;
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{5,20}$/.test(symbol) || typeof lookback !== 'number' || typeof breakoutPercent !== 'number' || typeof quoteAmount !== 'number' || typeof maxCapital !== 'number' || typeof cooldownMs !== 'number' || !Number.isInteger(lookback) || lookback < 2 || !Number.isFinite(breakoutPercent) || breakoutPercent <= 0 || !Number.isFinite(quoteAmount) || quoteAmount <= 0 || !Number.isFinite(maxCapital) || maxCapital < quoteAmount || !Number.isInteger(cooldownMs) || cooldownMs < 0) throw new Error('Invalid breakout parameters');
  const stopLossPercent = p.stopLossPercent ?? 3;
  const takeProfitPercent = p.takeProfitPercent ?? 6;
  if (!Number.isFinite(stopLossPercent) || stopLossPercent <= 0 || !Number.isFinite(takeProfitPercent) || takeProfitPercent <= 0) throw new Error('Invalid breakout exits');
  return { symbol, lookback, breakoutPercent, quoteAmount, maxCapital, cooldownMs, stopLossPercent, takeProfitPercent };
}

export function analyzeBreakout(parameters: BreakoutParameters, context: BreakoutContext): BreakoutResult {
  const p = validateBreakoutParameters(parameters);
  if (context.mode !== 'PAPER') return noOp('OUTSIDE_SCHEDULE', { mode: context.mode });
  if (context.candles.length < p.lookback + 1) return noOp('INSUFFICIENT_MARKET_DATA', { requiredCandles: p.lookback + 1 });
  if (context.lastTradeAt !== null && context.now - context.lastTradeAt < p.cooldownMs) return noOp('OUTSIDE_SCHEDULE', { reason: 'COOLDOWN' });
  const current = context.candles.at(-1)!;
  if ((context.positionQuantity ?? 0) > 0 && (context.averageEntryPrice ?? 0) > 0) {
    const entry = context.averageEntryPrice!;
    const stop = entry * (1 - (p.stopLossPercent ?? 3) / 100);
    const target = entry * (1 + (p.takeProfitPercent ?? 6) / 100);
    if (current.close <= stop || current.close >= target)
      return { proposals: [{ side: 'SELL', symbol: p.symbol, quantity: context.positionQuantity!, rationale: current.close <= stop ? `Breakout stop loss at ${current.close}` : `Breakout take profit at ${current.close}` }] };
      return noOp('MARKET_REGIME_NOT_SUITABLE', { reason: 'POSITION_ACTIVE' });
  }
  if (context.spentCapital + p.quoteAmount > p.maxCapital) return noOp('MARKET_REGIME_NOT_SUITABLE', { reason: 'CAPITAL_LIMIT' });
  const previous = context.candles.slice(-(p.lookback + 1), -1);
  const high = Math.max(...previous.map((candle) => candle.high));
  const threshold = high * (1 + p.breakoutPercent / 100);
  if (current.close <= threshold) return noOp('MARKET_REGIME_NOT_SUITABLE', { threshold, close: current.close });
  return { proposals: [{ side: 'BUY', symbol: p.symbol, quoteAmount: p.quoteAmount, rationale: `Paper breakout confirmed above ${threshold}` }] };
}
