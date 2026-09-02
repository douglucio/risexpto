import { describe, expect, it } from 'vitest';
import { buildPortfolioReport } from './index.js';
describe('portfolio report', () => {
  it('calculates capital, periods, exposure, attribution and drawdown', () => {
    const now = 10 * 86_400_000;
    const report = buildPortfolioReport(
      1000,
      [
        {
          botId: 'b1',
          strategyKey: 'dca',
          asset: 'BTC',
          value: 400,
          realizedPnl: 100,
          at: now - 2 * 86_400_000,
        },
        {
          botId: 'b2',
          strategyKey: 'grid',
          asset: 'ETH',
          value: 200,
          realizedPnl: -50,
          at: now - 40 * 86_400_000,
        },
      ],
      [{ asset: 'BTC', value: 500, unrealizedPnl: 25, at: now }],
      now,
    );
    expect(report).toMatchObject({
      totalCapital: 1075,
      allocatedCapital: 500,
      availableCapital: 575,
      dailyPnl: 0,
      weeklyPnl: 100,
      monthlyPnl: 100,
      cumulativePnl: 75,
    });
    expect(report.exposureByAsset).toEqual({ BTC: 500 });
    expect(report.performanceByStrategy).toEqual({ dca: 100, grid: -50 });
  });
  it('rejects invalid capital', () =>
    expect(() => buildPortfolioReport(-1, [], [], 0)).toThrow('non-negative'));
});
