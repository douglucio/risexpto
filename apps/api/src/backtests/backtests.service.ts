import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { runBacktest } from '@risexpto/backtesting';
import type { PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { cryptoDigitalTraders } from '@risexpto/digital-traders';

@Injectable()
export class BacktestsService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  async list(user: AuthenticatedUser) {
    return this.db.backtest.findMany({ where: { userId: userId(user) }, include: { result: true, strategyVersion: { include: { definition: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async run(user: AuthenticatedUser, body: Record<string, unknown>) {
    const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : '';
    const strategyVersionId = typeof body.strategyVersionId === 'string' ? body.strategyVersionId : '';
    const digitalTraderSlug = typeof body.digitalTraderSlug === 'string' ? body.digitalTraderSlug : undefined;
    const riskPreset = typeof body.traderRiskPreset === 'string' ? body.traderRiskPreset.toUpperCase() : 'BALANCED';
    const initialCapital = typeof body.initialCapital === 'number' ? body.initialCapital : Number(body.initialCapital);
    const start = new Date(String(body.periodStart));
    const end = new Date(String(body.periodEnd));
    if (!symbol || !strategyVersionId || !Number.isFinite(initialCapital) || initialCapital <= 0 || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new BadRequestException('Invalid backtest input');
    if (!['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'].includes(riskPreset)) throw new BadRequestException('Invalid risk preset');
    const version = await this.db.strategyVersion.findFirst({ where: { id: strategyVersionId, active: true, definition: { active: true } }, select: { id: true, implementationKey: true } });
    if (!version) throw new BadRequestException('Strategy version not found');
    if (digitalTraderSlug) {
      const trader = cryptoDigitalTraders.find((item) => item.slug === digitalTraderSlug);
      if (!trader || !trader.supportedStrategies.includes(version.implementationKey)) throw new BadRequestException('Digital Trader and strategy version do not match');
    }
    const snapshots = await this.db.marketSnapshot.findMany({ where: { symbol, closeTime: { gte: start, lte: end } }, orderBy: { closeTime: 'asc' }, select: { openTime: true, open: true, high: true, low: true, close: true, volume: true } });
    if (!snapshots.length) throw new BadRequestException('No persisted market data for period');
    const riskFactor = riskPreset === 'CONSERVATIVE' ? 0.25 : riskPreset === 'AGGRESSIVE' ? 0.75 : 0.5;
    const entryQuote = initialCapital * riskFactor;
    const result = runBacktest(initialCapital, snapshots.map((item) => ({ openTime: item.openTime.getTime(), open: Number(item.open), high: Number(item.high), low: Number(item.low), close: Number(item.close), volume: Number(item.volume) })), (candle, state, history) => {
      if (version.implementationKey === 'dca') return state.quantity === 0 ? { side: 'BUY', quoteAmount: entryQuote } : null;
      if (version.implementationKey === 'breakout') return history.length > 2 && candle.close > Math.max(...history.slice(-3, -1).map((item) => item.high)) ? { side: 'BUY', quoteAmount: entryQuote } : state.quantity > 0 && candle.close < state.averagePrice * 0.97 ? { side: 'SELL' } : null;
      if (version.implementationKey === 'trend-following') return state.quantity === 0 && history.length > 3 && candle.close > history.at(-2)!.close ? { side: 'BUY', quoteAmount: entryQuote } : state.quantity > 0 && candle.close < state.averagePrice ? { side: 'SELL' } : null;
      return state.quantity === 0 && candle.close <= candle.low ? { side: 'BUY', quoteAmount: entryQuote } : state.quantity > 0 && candle.close >= state.averagePrice * 1.03 ? { side: 'SELL' } : null;
    });
    return this.db.$transaction(async (tx) => {
      const backtest = await tx.backtest.create({ data: { userId: userId(user), strategyVersionId, symbol, parameters: { ...body, digitalTraderSlug: digitalTraderSlug ?? null, traderRiskPreset: riskPreset }, initialCapital, periodStart: start, periodEnd: end, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() } });
      await tx.backtestResult.create({ data: { backtestId: backtest.id, absoluteReturn: result.metrics.absoluteReturn, returnPercent: result.metrics.returnPercent, maxDrawdown: result.metrics.maxDrawdown, winRate: result.metrics.winRate, profitFactor: result.metrics.profitFactor, sharpeRatio: result.metrics.sharpe, tradeCount: result.metrics.tradeCount, estimatedFees: result.metrics.estimatedFees, metrics: { ...result.metrics, equityCurve: result.equityCurve } } });
      return { ...backtest, result: result.metrics, equityCurve: result.equityCurve, disclaimer: result.disclaimer };
    });
  }
}

function userId(user: AuthenticatedUser): string { if (!user.applicationUserId) throw new BadRequestException('Application user is not provisioned'); return user.applicationUserId; }
