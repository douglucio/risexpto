import { describe, expect, it } from 'vitest';
import { RiskEngine, type RiskContext } from './index.js';

const context: RiskContext = {
  symbol: 'BTCUSDT',
  amount: 0.01,
  price: 10_000,
  availableBalance: 500,
  allocatedCapital: 0,
  currentExposure: 0,
  positionValue: 0,
  openPositions: 0,
  dailyLoss: 0,
  drawdown: 0,
  lastTradeAt: null,
  botStatus: 'READY',
  tradingMode: 'PAPER',
  now: 1_000,
};
const engine = () =>
  new RiskEngine({
    maxAllocatedCapital: 10_000,
    maxTradeAmount: 200,
    maxExposure: 5_000,
    maxPositionPercent: 0.5,
    maxPositions: 3,
    maxDailyLoss: 500,
    maxDrawdown: 1_000,
    allowedSymbols: ['BTCUSDT'],
    cooldownMs: 100,
    allowLive: false,
  });

describe('RiskEngine', () => {
  it('approves a valid paper proposal with an auditable snapshot', () => {
    const result = engine().evaluate(context);
    expect(result.decision).toBe('APPROVED');
    expect(result.reasonCode).toBe('APPROVED');
    expect(result.riskSnapshot.proposedValue).toBe(100);
    expect(result.timestamp).toBe(1_000);
  });
  it('rejects the first violated limit with a stable reason code', () => {
    const result = engine().evaluate({ ...context, amount: 0.03, price: 10_000 });
    expect(result.decision).toBe('REJECTED');
    expect(result.reasonCode).toBe('TRADE_LIMIT');
  });
  it('covers security and operational guards', () => {
    expect(engine().evaluate({ ...context, tradingMode: 'LIVE' }).reasonCode).toBe('LIVE_DISABLED');
    expect(engine().evaluate({ ...context, symbol: 'ETHUSDT' }).reasonCode).toBe(
      'SYMBOL_NOT_ALLOWED',
    );
    expect(engine().evaluate({ ...context, lastTradeAt: 950 }).reasonCode).toBe('COOLDOWN');
    expect(engine().evaluate({ ...context, botStatus: 'PAUSED' }).reasonCode).toBe('BOT_NOT_READY');
  });
});
