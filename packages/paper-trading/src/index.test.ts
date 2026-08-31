import { describe, expect, it } from 'vitest';
import { PaperTradingEngine } from './index.js';

describe('PaperTradingEngine', () => {
  it('simulates buy, mark, sell, fees and realized P&L', () => {
    const engine = new PaperTradingEngine({ USDT: 1_000, BTC: 0 }, 0.001, () => 10);
    expect(engine.execute('BTCUSDT', 'BUY', 0.01, 10_000).status).toBe('FILLED');
    expect(engine.mark('BTCUSDT', 11_000).unrealizedPnl).toBeCloseTo(10, 5);
    expect(engine.execute('BTCUSDT', 'SELL', 0.005, 11_000).status).toBe('FILLED');
    const snapshot = engine.snapshot();
    expect(snapshot.orders).toHaveLength(2);
    expect(snapshot.realizedPnl).toBeCloseTo(4.945, 5);
    expect(snapshot.positions[0]?.quantity).toBeCloseTo(0.005, 7);
  });

  it('rejects insufficient funds and selling beyond a position without mutation', () => {
    const engine = new PaperTradingEngine({ USDT: 1, BTC: 0 });
    expect(engine.execute('BTCUSDT', 'BUY', 1, 100).status).toBe('REJECTED');
    expect(engine.execute('BTCUSDT', 'SELL', 1, 100).status).toBe('REJECTED');
    expect(engine.snapshot().balances.find((balance) => balance.asset === 'USDT')?.free).toBe(1);
  });
});
