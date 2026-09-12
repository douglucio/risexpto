import { Decimal } from 'decimal.js';
import type { PrismaClient } from '@risexpto/database';

export type TraderRuntimeContext = {
  traderInstanceId: string;
  userId: string;
  connectionId: string | null;
  assetSymbol: string;
  capitalMode: 'FIXED' | 'COMPOUND';
  authorizedCapital: Decimal;
  operationalCapital: Decimal;
  allocatedCapital: Decimal;
  availableCapital: Decimal;
  spentCapital: Decimal;
  reservedCapital: Decimal;
  positionQuantity: Decimal;
  averageEntryPrice: Decimal;
  currentMarketPrice: Decimal;
  currentPositionValue: Decimal;
  currentEquity: Decimal;
  highWaterMark: Decimal;
  currentDrawdownPercent: Decimal;
  realizedPnl: Decimal;
  unrealizedPnl: Decimal;
  todayRealizedPnl: Decimal;
  todayUnrealizedPnl: Decimal;
  currentExposure: Decimal;
  openOrders: number;
  openPositions: number;
  lastTradeAt: Date | null;
  lastBuyAt: Date | null;
  lastSellAt: Date | null;
  currentDrawdown: Decimal;
  dailyLoss: Decimal;
  traderStatus: string;
  riskPreset: string | null;
  connectionRiskState: {
    allocatedCapital: Decimal;
    currentExposure: Decimal;
    dailyLoss: Decimal;
    killSwitchActive: boolean;
  };
};

export function calculateSpentCapital(positions: readonly { quantity: Decimal.Value; averagePrice: Decimal.Value }[]): Decimal {
  return positions.reduce(
    (sum, position) => sum.plus(new Decimal(position.quantity).times(position.averagePrice)),
    new Decimal(0),
  );
}

export function calculateTodayUnrealizedPnl(input: {
  currentPrice: Decimal.Value;
  averagePrice: Decimal.Value;
  quantity: Decimal.Value;
  openedAt: Date;
  dayStart: Date;
  dayStartPrice?: Decimal.Value;
}): Decimal {
  const current = new Decimal(input.currentPrice).minus(input.averagePrice).times(input.quantity);
  if (input.openedAt >= input.dayStart || input.dayStartPrice === undefined) return current;
  const baseline = new Decimal(input.dayStartPrice).minus(input.averagePrice).times(input.quantity);
  return current.minus(baseline);
}

export function calculateEquityDrawdown(currentEquity: Decimal.Value, highWaterMark: Decimal.Value): {
  absolute: Decimal;
  percent: Decimal;
} {
  const equity = new Decimal(currentEquity);
  const high = Decimal.max(new Decimal(highWaterMark), equity);
  const absolute = Decimal.max(0, high.minus(equity));
  return { absolute, percent: high.isZero() ? new Decimal(0) : absolute.div(high).times(100) };
}

export class TraderRuntimeStateService {
  constructor(private readonly database: PrismaClient) {}

  async load(botId: string, currentMarketPrice: Decimal | string | number): Promise<TraderRuntimeContext> {
    const bot = await this.database.bot.findUniqueOrThrow({
      where: { id: botId },
      include: {
        configuration: true,
        riskProfile: true,
        exchangeConnection: true,
        paperPortfolio: true,
        paperCapitalAllocation: true,
        positions: { where: { status: 'OPEN', managed: true, tradingMode: 'PAPER' } },
        paperReservations: { where: { status: 'ACTIVE' } },
        paperBalances: true,
        orders: { where: { tradingMode: 'PAPER', status: { in: ['CREATED', 'SUBMITTED', 'PARTIALLY_FILLED'] } } },
      },
    });
    const configuration = bot.configuration;
    if (!configuration) throw new Error('TRADER_RUNTIME_CONFIGURATION_MISSING');
    const position = bot.positions.find((item) => item.symbol === (bot.assetSymbol ?? configuration.allowedSymbols[0]));
    const price = new Decimal(currentMarketPrice);
    const quantity = new Decimal(position?.quantity ?? 0);
    const average = new Decimal(position?.averagePrice ?? 0);
    const currentValue = quantity.times(price);
    const allTrades = await this.database.trade.findMany({
      where: { order: { botId, tradingMode: 'PAPER' } },
      orderBy: { executedAt: 'desc' },
      select: { realizedPnl: true, executedAt: true, order: { select: { side: true } } },
    });
    const realizedPnl = allTrades.reduce((sum, trade) => sum.plus(trade.realizedPnl), new Decimal(0));
    const reservations = bot.paperReservations.reduce((sum, item) => sum.plus(item.amount), new Decimal(0));
    const spentCapital = await this.spentCapital(botId);
    const authorized = new Decimal(configuration.authorizedCapital);
    const operational = bot.capitalMode === 'COMPOUND'
      ? Decimal.max(0, authorized.plus(realizedPnl))
      : authorized;
    const allocated = new Decimal(bot.paperCapitalAllocation?.allocated ?? bot.exchangeConnection?.allocatedCapital ?? authorized);
    const quoteBalance = bot.paperBalances.find((balance) => balance.asset === configuration.quoteCurrency);
    const available = Decimal.max(0, new Decimal(quoteBalance?.free ?? authorized).minus(reservations));
    const currentEquity = new Decimal(quoteBalance?.free ?? authorized).plus(currentValue);
    const highWaterMark = Decimal.max(new Decimal(bot.equityHighWaterMark ?? 0), currentEquity);
    if (highWaterMark.greaterThan(new Decimal(bot.equityHighWaterMark ?? 0)) && typeof this.database.bot.update === 'function') {
      await this.database.bot.update({ where: { id: bot.id }, data: { equityHighWaterMark: highWaterMark } });
    }
    const drawdown = Decimal.max(0, highWaterMark.minus(currentEquity));
    const unrealized = price.minus(average).times(quantity);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayTrades = allTrades.filter((trade) => trade.executedAt >= today);
    const todayRealized = todayTrades.reduce((sum, item) => sum.plus(item.realizedPnl), new Decimal(0));
    const dayStartMarket = position && position.openedAt < today
      ? await this.database.marketSnapshot.findFirst({ where: { symbol: position.symbol, closeTime: { lte: today } }, orderBy: { closeTime: 'desc' }, select: { close: true } })
      : null;
    const todayUnrealized = position
      ? calculateTodayUnrealizedPnl({ currentPrice: price, averagePrice: average, quantity, openedAt: position.openedAt, dayStart: today, ...(dayStartMarket ? { dayStartPrice: dayStartMarket.close } : {}) })
      : new Decimal(0);
    const lastBuy = allTrades.find((item) => item.order.side === 'BUY')?.executedAt ?? null;
    const lastSell = allTrades.find((item) => item.order.side === 'SELL')?.executedAt ?? null;
    const lastTradeAt = allTrades[0]?.executedAt ?? null;
    return {
      traderInstanceId: bot.id,
      userId: bot.userId,
      connectionId: bot.exchangeConnectionId,
      assetSymbol: bot.assetSymbol ?? configuration.allowedSymbols[0] ?? '',
      capitalMode: bot.capitalMode,
      authorizedCapital: authorized,
      operationalCapital: operational,
      allocatedCapital: allocated,
      availableCapital: available,
      spentCapital,
      reservedCapital: reservations,
      positionQuantity: quantity,
      averageEntryPrice: average,
      currentMarketPrice: price,
      currentPositionValue: currentValue,
      realizedPnl,
      unrealizedPnl: unrealized,
      todayRealizedPnl: todayRealized,
      todayUnrealizedPnl: todayUnrealized,
      currentExposure: currentValue,
      openOrders: bot.orders.length,
      openPositions: position ? 1 : 0,
      lastTradeAt,
      lastBuyAt: lastBuy,
      lastSellAt: lastSell,
      currentEquity,
      highWaterMark,
      currentDrawdownPercent: highWaterMark.isZero() ? new Decimal(0) : drawdown.div(highWaterMark).times(100),
      currentDrawdown: drawdown,
      dailyLoss: Decimal.max(0, todayRealized.negated()),
      traderStatus: bot.status,
      riskPreset: bot.riskProfile?.preset ?? null,
      connectionRiskState: {
        allocatedCapital: new Decimal(bot.paperPortfolio?.allocatedCapital ?? bot.exchangeConnection?.allocatedCapital ?? 0),
        currentExposure: currentValue,
        dailyLoss: Decimal.max(0, todayRealized.negated()),
        killSwitchActive: bot.paperPortfolio?.killSwitchActive ?? bot.exchangeConnection?.killSwitchActive ?? false,
      },
    };
  }

  private async spentCapital(botId: string): Promise<Decimal> {
    const positions = await this.database.position.findMany({
      where: { botId, tradingMode: 'PAPER', status: 'OPEN', managed: true },
      select: { quantity: true, averagePrice: true },
    });
    return calculateSpentCapital(positions);
  }
}
