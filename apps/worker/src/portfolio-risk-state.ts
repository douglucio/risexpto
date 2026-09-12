import { Decimal } from 'decimal.js';
import type { PrismaClient } from '@risexpto/database';

export class PortfolioRiskStateService {
  constructor(private readonly database: PrismaClient) {}

  async load(botId: string) {
    const bot = await this.database.bot.findUniqueOrThrow({ where: { id: botId }, select: { userId: true, exchangeConnectionId: true, paperPortfolioId: true, exchangeConnection: { select: { maximumExposure: true, maximumDailyLoss: true, killSwitchActive: true } }, paperPortfolio: { select: { maximumExposure: true, maximumDailyLoss: true, killSwitchActive: true } } } });
    const bots = await this.database.bot.findMany({ where: { userId: bot.userId, tradingMode: 'PAPER', archivedAt: null, ...(bot.paperPortfolioId ? { paperPortfolioId: bot.paperPortfolioId } : bot.exchangeConnectionId ? { exchangeConnectionId: bot.exchangeConnectionId } : {}) }, select: { id: true, positions: { where: { status: 'OPEN', managed: true, tradingMode: 'PAPER' }, select: { quantity: true, averagePrice: true, symbol: true } }, paperCapitalAllocation: { select: { allocated: true, active: true } } } });
    let exposure = new Decimal(0);
    for (const item of bots) for (const position of item.positions) {
      const market = await this.database.marketSnapshot.findFirst({ where: { symbol: position.symbol }, orderBy: { closeTime: 'desc' }, select: { close: true } });
      exposure = exposure.plus(new Decimal(position.quantity).times(market?.close ?? position.averagePrice));
    }
    const allocated = bots.reduce((sum, item) => item.paperCapitalAllocation?.active ? sum.plus(item.paperCapitalAllocation.allocated) : sum, new Decimal(0));
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const realized = await this.database.trade.aggregate({ where: { order: { botId: { in: bots.map((item) => item.id) }, tradingMode: 'PAPER' }, executedAt: { gte: start } }, _sum: { realizedPnl: true } });
    const configured = bot.paperPortfolio ?? bot.exchangeConnection;
    return {
      allocatedCapital: allocated,
      currentExposure: exposure,
      dailyLoss: Decimal.max(0, new Decimal(realized._sum.realizedPnl ?? 0).negated()),
      activeTraders: bots.length,
      maximumExposure: new Decimal(configured?.maximumExposure ?? 0),
      maximumDailyLoss: new Decimal(configured?.maximumDailyLoss ?? 0),
      killSwitchActive: configured?.killSwitchActive ?? false,
    };
  }
}
