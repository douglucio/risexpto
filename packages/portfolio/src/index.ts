export type PortfolioTrade = {
  botId: string;
  strategyKey: string;
  asset: string;
  value: number;
  realizedPnl: number;
  at: number;
};
export type PortfolioMark = { asset: string; value: number; unrealizedPnl: number; at: number };
export type PortfolioReport = {
  totalCapital: number;
  allocatedCapital: number;
  availableCapital: number;
  realizedPnl: number;
  unrealizedPnl: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  cumulativePnl: number;
  maxDrawdown: number;
  exposureByAsset: Record<string, number>;
  performanceByBot: Record<string, number>;
  performanceByStrategy: Record<string, number>;
};
export function buildPortfolioReport(
  initialCapital: number,
  trades: readonly PortfolioTrade[],
  marks: readonly PortfolioMark[],
  now: number,
): PortfolioReport {
  if (!Number.isFinite(initialCapital) || initialCapital < 0)
    throw new Error('Initial capital must be non-negative');
  const realizedPnl = trades.reduce((sum, trade) => sum + trade.realizedPnl, 0);
  const unrealizedPnl = marks.reduce((sum, mark) => sum + mark.unrealizedPnl, 0);
  const allocatedCapital = marks.reduce((sum, mark) => sum + mark.value, 0);
  const totalCapital = initialCapital + realizedPnl + unrealizedPnl;
  const byPeriod = (days: number) =>
    trades
      .filter((trade) => trade.at >= now - days * 86_400_000)
      .reduce((sum, trade) => sum + trade.realizedPnl, 0);
  const exposureByAsset: Record<string, number> = {};
  for (const mark of marks)
    exposureByAsset[mark.asset] = (exposureByAsset[mark.asset] ?? 0) + mark.value;
  const performanceByBot: Record<string, number> = {};
  const performanceByStrategy: Record<string, number> = {};
  for (const trade of trades) {
    performanceByBot[trade.botId] = (performanceByBot[trade.botId] ?? 0) + trade.realizedPnl;
    performanceByStrategy[trade.strategyKey] =
      (performanceByStrategy[trade.strategyKey] ?? 0) + trade.realizedPnl;
  }
  let peak = initialCapital;
  let equity = initialCapital;
  let maxDrawdown = 0;
  for (const trade of [...trades].sort((a, b) => a.at - b.at)) {
    equity += trade.realizedPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak === 0 ? 0 : (peak - equity) / peak);
  }
  return {
    totalCapital,
    allocatedCapital,
    availableCapital: totalCapital - allocatedCapital,
    realizedPnl,
    unrealizedPnl,
    dailyPnl: byPeriod(1),
    weeklyPnl: byPeriod(7),
    monthlyPnl: byPeriod(30),
    cumulativePnl: realizedPnl + unrealizedPnl,
    maxDrawdown,
    exposureByAsset,
    performanceByBot,
    performanceByStrategy,
  };
}
