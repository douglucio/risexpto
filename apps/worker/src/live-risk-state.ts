import { randomUUID } from 'node:crypto';
import { Decimal } from 'decimal.js';
import type { PrismaClient } from '@risexpto/database';

export async function refreshLiveRiskState(database: PrismaClient, botId: string): Promise<void> {
  const bot = await database.bot.findUnique({
    where: { id: botId },
    select: { id: true, tradingMode: true, configuration: { select: { authorizedCapital: true } } },
  });
  if (!bot || bot.tradingMode !== 'LIVE' || !bot.configuration)
    throw new Error('LIVE_RISK_BOT_CONTEXT_UNAVAILABLE');
  const positions = await database.position.findMany({
    where: { botId, tradingMode: 'LIVE' },
    select: { symbol: true, status: true, quantity: true, averagePrice: true, realizedPnl: true },
  });
  const open = positions.filter((position) => position.status === 'OPEN' && new Decimal(position.quantity).greaterThan(0));
  const prices = new Map<string, Decimal>();
  for (const position of open) {
    const snapshot = await database.marketSnapshot.findFirst({
      where: { provider: 'BINANCE', symbol: position.symbol },
      orderBy: { closeTime: 'desc' },
      select: { close: true },
    });
    if (!snapshot || new Decimal(snapshot.close).lte(0)) throw new Error(`LIVE_RISK_PRICE_UNAVAILABLE:${position.symbol}`);
    prices.set(position.symbol, new Decimal(snapshot.close));
  }
  const exposure = open.reduce((total, position) => total.plus(new Decimal(position.quantity).times(prices.get(position.symbol)!)), new Decimal(0));
  const realizedPnl = positions.reduce((total, position) => total.plus(new Decimal(position.realizedPnl)), new Decimal(0));
  const unrealizedPnl = open.reduce((total, position) => total.plus(new Decimal(position.quantity).times(prices.get(position.symbol)!.minus(position.averagePrice))), new Decimal(0));
  const equity = new Decimal(bot.configuration.authorizedCapital).plus(realizedPnl).plus(unrealizedPnl);
  const previous = await database.liveRiskState.findUnique({ where: { botId }, select: { id: true, peakEquity: true } });
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const todayTrades = await database.trade.findMany({
    where: { executedAt: { gte: startOfDay }, order: { botId, tradingMode: 'LIVE' } },
    select: { realizedPnl: true },
  });
  const dailyRealized = todayTrades.reduce((total, trade) => total.plus(new Decimal(trade.realizedPnl)), new Decimal(0));
  const dailyLoss = Decimal.max(new Decimal(0), dailyRealized.negated());
  const peakEquity = Decimal.max(new Decimal(previous?.peakEquity ?? bot.configuration.authorizedCapital), equity);
  const drawdown = peakEquity.greaterThan(0) ? Decimal.max(new Decimal(0), peakEquity.minus(equity).dividedBy(peakEquity)) : new Decimal(1);
  await database.liveRiskState.upsert({
    where: { botId },
    create: {
      id: randomUUID(), botId, currentExposure: exposure.toString(), openPositions: open.length,
      dailyLoss: dailyLoss.toString(), drawdown: drawdown.toString(), peakEquity: peakEquity.toString(),
    },
    update: { currentExposure: exposure.toString(), openPositions: open.length, dailyLoss: dailyLoss.toString(), drawdown: drawdown.toString(), peakEquity: peakEquity.toString() },
  });
}
