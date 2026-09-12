import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { runBacktest } from '@risexpto/backtesting';
import type { PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { cryptoDigitalTraders } from '@risexpto/digital-traders';
import { createDcaStrategy } from '@risexpto/strategy-dca';
import { buildGridOrders } from '@risexpto/strategy-grid';
import { createTrendStrategy } from '@risexpto/strategy-trend';
import { analyzeBreakout } from '@risexpto/strategy-breakout';

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
    const version = await this.db.strategyVersion.findFirst({ where: { id: strategyVersionId, active: true, definition: { active: true } }, select: { id: true, version: true, implementationKey: true } });
    if (!version) throw new BadRequestException('Strategy version not found');
    if (digitalTraderSlug) {
      const trader = cryptoDigitalTraders.find((item) => item.slug === digitalTraderSlug);
      if (!trader || !trader.supportedStrategies.includes(version.implementationKey)) throw new BadRequestException('Digital Trader and strategy version do not match');
    }
    const snapshots = await this.db.marketSnapshot.findMany({ where: { symbol, closeTime: { gte: start, lte: end } }, orderBy: { closeTime: 'asc' }, select: { openTime: true, open: true, high: true, low: true, close: true, volume: true } });
    if (!snapshots.length) throw new BadRequestException('No persisted market data for period');
    const riskFactor = riskPreset === 'CONSERVATIVE' ? 0.25 : riskPreset === 'AGGRESSIVE' ? 0.75 : 0.5;
    const entryQuote = initialCapital * riskFactor;
    const candles = snapshots.map((item) => ({ openTime: item.openTime.getTime(), open: Number(item.open), high: Number(item.high), low: Number(item.low), close: Number(item.close), volume: Number(item.volume) }));
    const strategyParameters: Record<string, unknown> = { ...(body.parameters && typeof body.parameters === 'object' ? body.parameters as Record<string, unknown> : {}), symbol, quoteAmount: entryQuote, maxCapital: initialCapital };
    const strategyVersion = `${version.version}.0.0`;
    const dca = version.implementationKey === 'dca' ? createDcaStrategy(strategyVersion, { ...strategyParameters, intervalMs: Number(strategyParameters.intervalMs ?? 86_400_000) } as never) : null;
    const trend = version.implementationKey === 'trend-following' ? createTrendStrategy(strategyVersion, strategyParameters as never) : null;
    const result = runBacktest(initialCapital, candles, (candle, state, history) => {
      if (dca) return dca.analyze({ now: candle.openTime, lastPurchaseAt: state.quantity === 0 ? null : candle.openTime - 86_400_001, spentCapital: initialCapital - state.cash, price: candle.close, mode: 'PAPER' })[0] ?? null;
      if (trend) {
        const proposal = trend.analyze({ candles: history.map((item) => ({ ...item, openTime: item.openTime })), spentCapital: initialCapital - state.cash, positionQuantity: state.quantity, mode: 'PAPER' })[0];
        return proposal?.side === 'BUY' && proposal.quoteAmount !== undefined ? { side: 'BUY', quoteAmount: proposal.quoteAmount } : proposal?.side === 'SELL' && proposal.quantity !== undefined ? { side: 'SELL', quantity: proposal.quantity } : null;
      }
      if (version.implementationKey === 'breakout') {
        const breakout = analyzeBreakout(strategyParameters as never, { now: candle.openTime, candles: history, spentCapital: initialCapital - state.cash, lastTradeAt: null, positionQuantity: state.quantity, averageEntryPrice: state.averagePrice, mode: 'PAPER' });
        if ('proposals' in breakout) { const signal = breakout.proposals[0]; return signal?.side === 'BUY' && signal.quoteAmount !== undefined ? { side: 'BUY', quoteAmount: signal.quoteAmount } : signal?.side === 'SELL' && signal.quantity !== undefined ? { side: 'SELL', quantity: signal.quantity } : null; }
        return null;
      }
      const orders = buildGridOrders({ ...strategyParameters, lowerPrice: Number(strategyParameters.lowerPrice ?? candle.close * 0.88), upperPrice: Number(strategyParameters.upperPrice ?? candle.close * 1.12), levels: Number(strategyParameters.levels ?? 6), capital: entryQuote, maxVolatility: Number(strategyParameters.maxVolatility ?? 100), referencePrice: candle.close } as never, { price: candle.close, volatility: 0, availableBalance: state.cash, mode: 'PAPER' });
      const signal = state.quantity === 0 ? orders.find((order) => order.side === 'BUY' && candle.close <= order.price) : orders.find((order) => order.side === 'SELL' && candle.close >= order.price);
      return signal?.side === 'BUY' ? { side: 'BUY', quoteAmount: signal.quoteAmount } : signal ? { side: 'SELL', quantity: Math.min(state.quantity, signal.quoteAmount / candle.close) } : null;
    });
    return this.db.$transaction(async (tx) => {
      const backtest = await tx.backtest.create({ data: { userId: userId(user), strategyVersionId, symbol, parameters: { ...body, digitalTraderSlug: digitalTraderSlug ?? null, traderRiskPreset: riskPreset }, initialCapital, periodStart: start, periodEnd: end, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() } });
      await tx.backtestResult.create({ data: { backtestId: backtest.id, absoluteReturn: result.metrics.absoluteReturn, returnPercent: result.metrics.returnPercent, maxDrawdown: result.metrics.maxDrawdown, winRate: result.metrics.winRate, profitFactor: result.metrics.profitFactor, sharpeRatio: result.metrics.sharpe, tradeCount: result.metrics.tradeCount, estimatedFees: result.metrics.estimatedFees, metrics: { ...result.metrics, equityCurve: result.equityCurve } } });
      return { ...backtest, result: result.metrics, equityCurve: result.equityCurve, disclaimer: result.disclaimer };
    });
  }
}

function userId(user: AuthenticatedUser): string { if (!user.applicationUserId) throw new BadRequestException('Application user is not provisioned'); return user.applicationUserId; }
