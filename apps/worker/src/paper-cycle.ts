import { createHash } from 'node:crypto';
import { Decimal } from 'decimal.js';
import { createDcaStrategy, type DcaParameters } from '@risexpto/strategy-dca';
import { buildGridOrders, type GridParameters } from '@risexpto/strategy-grid';
import { createTrendStrategy, type TrendParameters } from '@risexpto/strategy-trend';
import { analyzeBreakout, type BreakoutParameters } from '@risexpto/strategy-breakout';
import { RiskEngine } from '@risexpto/risk-engine';
import type { PrismaClient } from '@risexpto/database';
import type { Job } from 'bullmq';
import type { WorkerJob } from './queue.js';
import { assertFreshMarketData } from './market-data-runtime.js';
import { noOp } from '@risexpto/digital-traders';
import { evaluatePortfolioRisk } from '@risexpto/digital-traders';
import { TraderRuntimeStateService, type TraderRuntimeContext } from './trader-runtime-state.js';
import { notifyTrader } from './runtime-notifications.js';
import { PortfolioRiskStateService } from './portfolio-risk-state.js';
import { applySpotPositionFill } from './paper-fills.js';

export async function processPaperCycle(
  database: PrismaClient,
  job: Job<WorkerJob>,
): Promise<void> {
  if (job.data.type !== 'bot-cycle' || !job.data.botId) return;
  const bot = await database.bot.findFirst({
    where: { id: job.data.botId, tradingMode: 'PAPER', status: 'RUNNING', archivedAt: null },
    include: { configuration: true, riskProfile: true, exchangeConnection: true, strategyVersion: { include: { definition: true } } },
  });
  if (!bot?.configuration) return;
  const killSwitch = await database.killSwitchState.findFirst({
    where: {
      active: true,
      OR: [
        { scope: 'SYSTEM', targetId: 'global' },
        { scope: 'USER', targetId: bot.userId },
        { scope: 'BOT', targetId: bot.id },
      ],
    },
    select: { scope: true, reason: true },
  });
  if (killSwitch) {
    await database.botEvent.create({
      data: {
        botId: bot.id,
        type: 'CYCLE_BLOCKED',
        payload: { jobId: job.id, scope: killSwitch.scope, reason: killSwitch.reason },
      },
    });
    return;
  }
  await database.botEvent.create({
    data: { botId: bot.id, type: 'CYCLE_STARTED', payload: { jobId: job.id } },
  });
  try {
    const symbol = bot.configuration.allowedSymbols[0];
    if (!symbol) {
      await markWaiting(database, bot.id, 'INSUFFICIENT_MARKET_DATA');
      await complete(database, bot.id, job, 'MARKET_DATA_UNAVAILABLE');
      return;
    }
    const markets = typeof database.marketSnapshot.findMany === 'function'
      ? await database.marketSnapshot.findMany({
          where: { symbol, interval: bot.configuration.marketDataTimeframe },
          orderBy: { closeTime: 'desc' },
          select: { close: true, high: true, low: true, volume: true, openTime: true, closeTime: true },
          take: bot.configuration.historyDepth,
        })
      : await database.marketSnapshot.findFirst({
          where: { symbol, interval: bot.configuration.marketDataTimeframe },
          orderBy: { closeTime: 'desc' },
          select: { close: true, high: true, low: true, volume: true, openTime: true, closeTime: true },
        }).then((market) => (market ? [market] : []));
    const market = markets[0];
    if (!market) {
      await markWaiting(database, bot.id, 'INSUFFICIENT_MARKET_DATA');
      await complete(database, bot.id, job, 'MARKET_DATA_UNAVAILABLE');
      return;
    }
    try {
      assertFreshMarketData(market.closeTime, Date.now(), freshnessWindowMs(bot.configuration.marketDataTimeframe));
    } catch {
      await markWaiting(database, bot.id, 'MARKET_REGIME_NOT_SUITABLE');
      await complete(database, bot.id, job, 'STALE_MARKET_DATA');
      return;
    }
    const runtime = await new TraderRuntimeStateService(database).load(bot.id, market.close);
    const portfolioState = await new PortfolioRiskStateService(database).load(bot.id);
    const gridLevels = bot.strategyVersion.implementationKey === 'grid'
      ? await ensureGridLevels(database, bot.id, bot.configuration.parameters, bot.configuration.authorizedCapital, Number(market.close), bot.riskProfile?.preset)
      : [];
    const proposal = createPaperProposal(
      bot.strategyVersion.implementationKey,
      bot.configuration.parameters,
      bot.configuration.allowedSymbols,
      markets,
      runtime,
      gridLevels,
    );
    if (!proposal) {
      const waitingReason = waitingReasonForStrategy(bot.strategyVersion.implementationKey, bot.configuration.parameters, runtime, Number(market.close));
      await markWaiting(database, bot.id, waitingReason);
      await complete(database, bot.id, job, waitingReason);
      return;
    }
    await database.bot.update({ where: { id: bot.id }, data: { waitingReason: null, waitingSince: null } });
    const id = correlationId(String(job.id));
    await database.tradeProposal.upsert({
      where: { botId_correlationId: { botId: bot.id, correlationId: id } },
      create: {
        botId: bot.id,
        strategyVersionId: bot.strategyVersionId,
        correlationId: id,
        symbol: proposal.symbol,
        side: proposal.side,
        orderType: 'MARKET',
        quoteAmount: proposal.quoteAmount,
        rationale: { text: proposal.rationale, marketCloseTime: market.closeTime.toISOString() },
      },
      update: {},
    });
    const storedProposal = await database.tradeProposal.findUniqueOrThrow({
      where: { botId_correlationId: { botId: bot.id, correlationId: id } },
      include: { order: { select: { id: true } } },
    });
    if (storedProposal.order) {
      await complete(database, bot.id, job, 'DUPLICATE_ALREADY_EXECUTED');
      return;
    }
    const profile = await database.riskProfile.findUnique({ where: { botId: bot.id } });
    if (!profile) {
      await database.riskEvent.create({
        data: {
          botId: bot.id,
          tradeProposalId: storedProposal.id,
          decision: 'REJECTED',
          reasonCode: 'RISK_PROFILE_MISSING',
          reason: 'Bot has no configured risk profile.',
          riskSnapshot: {},
        },
      });
      await database.tradeProposal.update({
        where: { id: storedProposal.id },
        data: { status: 'REJECTED', decidedAt: new Date() },
      });
      await complete(database, bot.id, job, 'RISK_REJECTED');
      return;
    }
    const portfolioRisk = evaluatePortfolioRisk({
      side: proposal.side,
      proposedExposure: Number(proposal.quoteAmount),
      currentExposure: Number(portfolioState.currentExposure),
      allocatedCapital: Number(portfolioState.allocatedCapital),
      maximumExposure: Number(portfolioState.maximumExposure) || Number.POSITIVE_INFINITY,
      dailyLoss: Number(portfolioState.dailyLoss),
      maximumDailyLoss: Number(portfolioState.maximumDailyLoss) || Number.POSITIVE_INFINITY,
      killSwitchActive: portfolioState.killSwitchActive,
    });
    if (!portfolioRisk.approved) {
      await database.riskEvent.create({ data: { botId: bot.id, riskProfileId: profile.id, tradeProposalId: storedProposal.id, decision: 'REJECTED', reasonCode: portfolioRisk.reasonCode, reason: 'Connection portfolio risk rejected the proposal.', riskSnapshot: portfolioRisk } });
      await database.tradeProposal.update({ where: { id: storedProposal.id }, data: { status: 'REJECTED', decidedAt: new Date() } });
      if (portfolioRisk.action === 'PAUSE') await database.bot.update({ where: { id: bot.id }, data: { status: 'RISK_BLOCKED', waitingReason: portfolioRisk.reasonCode, waitingSince: new Date() } });
      else await database.botEvent.create({ data: { botId: bot.id, type: 'RISK_SKIPPED', payload: { reasonCode: portfolioRisk.reasonCode, proposalId: storedProposal.id } } });
      await complete(database, bot.id, job, 'PORTFOLIO_RISK_REJECTED');
      return;
    }
    const risk = new RiskEngine({
      maxAllocatedCapital: Number(profile.maxAllocatedCapital),
      maxTradeAmount: Number(profile.maxTradeAmount),
      maxExposure: (Number(profile.maxAllocatedCapital) * Number(profile.maxExposurePercent)) / 100,
      maxPositionPercent: Number(profile.maxPositionPercent) / 100,
      maxPositions: profile.maxPositions,
      maxDailyLoss:
        (Number(profile.maxAllocatedCapital) * Number(profile.maxDailyLossPercent)) / 100,
      maxDrawdown: (Number(profile.maxAllocatedCapital) * Number(profile.maxDrawdownPercent)) / 100,
      allowedSymbols: profile.allowedSymbols,
      cooldownMs: profile.cooldownSeconds * 1000,
      allowLive: false,
    }).evaluate({
      side: proposal.side,
      symbol: proposal.symbol,
      amount: proposal.quantity ?? Number(proposal.quoteAmount) / Number(market.close),
      price: Number(market.close),
      availableBalance: Number(runtime.availableCapital),
      allocatedCapital: Number(runtime.allocatedCapital),
      currentExposure: Number(runtime.currentExposure),
      positionValue: Number(runtime.currentPositionValue),
      openPositions: runtime.openPositions,
      dailyLoss: Number(runtime.dailyLoss),
      drawdown: Number(runtime.currentDrawdown),
      lastTradeAt: runtime.lastTradeAt?.getTime() ?? null,
      botStatus: 'RUNNING',
      tradingMode: bot.tradingMode,
    });
    if (risk.decision === 'APPROVED') {
      const reserved = await reserveCapital(
        database,
        bot.id,
        storedProposal.id,
        Number(profile.maxAllocatedCapital),
        Number(proposal.quoteAmount),
        proposal.side,
      );
      if (!reserved) {
        risk.decision = 'REJECTED';
        risk.reasonCode = 'CAPITAL_RESERVATION_CONFLICT';
        risk.reason = 'Capital is already reserved by another concurrent cycle.';
      }
    }
    await database.riskEvent.create({
      data: {
        botId: bot.id,
        riskProfileId: profile.id,
        tradeProposalId: storedProposal.id,
        decision: risk.decision,
        reasonCode: risk.reasonCode,
        reason: risk.reason,
        riskSnapshot: risk.riskSnapshot,
      },
    });
    await database.tradeProposal.update({
      where: { id: storedProposal.id },
      data: {
        status: risk.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        decidedAt: new Date(),
      },
    });
    if (risk.decision !== 'APPROVED') {
      if (risk.action === 'PAUSE') await database.bot.update({ where: { id: bot.id }, data: { status: 'RISK_BLOCKED' } });
      else await database.botEvent.create({ data: { botId: bot.id, type: 'RISK_SKIPPED', payload: { reasonCode: risk.reasonCode, proposalId: storedProposal.id } } });
      await notifyTrader(database, { userId: bot.userId, botId: bot.id, connectionId: bot.exchangeConnectionId, type: 'RISK_PAUSED', severity: 'WARNING', title: 'Trader risk blocked an order', body: risk.reason, data: { reasonCode: risk.reasonCode, proposalId: storedProposal.id } });
    }
    if (risk.decision === 'APPROVED') {
      await executePaperOrder(
        database,
        bot.id,
        storedProposal.id,
        proposal.symbol,
        proposal.side,
        Number(proposal.quoteAmount),
        Number(market.close),
        bot.configuration.quoteCurrency,
        Number(runtime.operationalCapital),
        proposal.quantity,
      );
      if (proposal.gridLevel !== undefined && typeof database.paperGridLevel?.updateMany === 'function') {
        await database.paperGridLevel.updateMany({ where: { botId: bot.id, level: proposal.gridLevel, status: 'OPEN' }, data: { status: 'EXECUTED', executionCount: { increment: 1 }, lastExecutedAt: new Date() } });
        if (proposal.side === 'SELL') {
          // A completed sell re-arms executed buy levels for the next bounded
          // inventory cycle. The execution timestamp prevents same-tick replay.
          await database.paperGridLevel.updateMany({ where: { botId: bot.id, side: 'BUY', status: 'EXECUTED' }, data: { status: 'OPEN' } });
        }
      }
      await database.tradeProposal.update({
        where: { id: storedProposal.id },
        data: { status: 'EXECUTED' },
      });
      await notifyTrader(database, { userId: bot.userId, botId: bot.id, connectionId: bot.exchangeConnectionId, type: 'ORDER_FILLED', severity: 'SUCCESS', title: `${bot.name} filled an order`, body: `${proposal.side} ${proposal.symbol} Paper order filled.`, data: { proposalId: storedProposal.id, quoteAmount: proposal.quoteAmount } });
    }
    await complete(
      database,
      bot.id,
      job,
      risk.decision === 'APPROVED' ? 'RISK_APPROVED' : 'RISK_REJECTED',
    );
  } catch (error) {
    await database.botEvent.create({
      data: {
        botId: bot.id,
        type: 'CYCLE_FAILED',
        payload: { jobId: job.id, error: safeError(error) },
      },
    });
    throw error;
  }
}

function freshnessWindowMs(timeframe: string): number {
  const match = /^(\d+)([mhd])$/.exec(timeframe);
  if (!match) return 120_000;
  const unit = match[2] === 'h' ? 3_600_000 : match[2] === 'd' ? 86_400_000 : 60_000;
  return Math.max(120_000, Number(match[1]) * unit * 2);
}

type PaperMarket = { close: unknown; high: unknown; low: unknown; volume: unknown; openTime: Date; closeTime: Date };
type PaperProposal = { side: 'BUY' | 'SELL'; symbol: string; quoteAmount: number; quantity?: number; gridLevel?: number; rationale: string };

function createPaperProposal(implementationKey: string, rawParameters: unknown, allowedSymbols: string[], markets: readonly PaperMarket[], runtime: TraderRuntimeContext, gridLevels: readonly { level: number; price: unknown; side: 'BUY' | 'SELL'; status: string }[] = []): PaperProposal | null {
  const symbol = allowedSymbols[0];
  const latest = markets[0];
  if (!symbol || !latest) return null;
  const candles = [...markets].reverse().map((market) => ({ open: Number(market.close), high: Number(market.high), low: Number(market.low), close: Number(market.close), volume: Number(market.volume), openTime: market.openTime.getTime() }));
  if (implementationKey === 'dca') {
    const parameters = dcaParameters(rawParameters, allowedSymbols);
    return createDcaStrategy(`0.0.1`, parameters).analyze({ now: Date.now(), lastPurchaseAt: runtime.lastBuyAt?.getTime() ?? null, spentCapital: Number(runtime.spentCapital), price: Number(latest.close), mode: 'PAPER' })[0] ?? null;
  }
  if (implementationKey === 'grid') {
    const parameters = rawParameters as GridParameters;
    const orders = buildGridOrders(parameters, { price: Number(latest.close), volatility: ((Number(latest.high) - Number(latest.low)) / Number(latest.close)) * 100, availableBalance: Number(runtime.availableCapital), mode: 'PAPER' });
    const order = orders.find((item) => item.side === 'SELL' && Number(latest.close) >= item.price && runtime.positionQuantity.gt(0) && gridLevels.some((level) => level.level === item.level && level.status === 'OPEN'))
      ?? orders.find((item) => item.side === 'BUY' && Number(latest.close) <= item.price && runtime.spentCapital.plus(String(item.quoteAmount)).lte(runtime.operationalCapital) && gridLevels.some((level) => level.level === item.level && level.status === 'OPEN'));
    if (!order) return null;
    return order.side === 'SELL'
      ? { side: 'SELL', symbol, quoteAmount: Number(Decimal.min(runtime.positionQuantity, new Decimal(String(order.quoteAmount)).dividedBy(String(latest.close))).times(String(latest.close))), quantity: Number(Decimal.min(runtime.positionQuantity, new Decimal(String(order.quoteAmount)).dividedBy(String(latest.close)))), gridLevel: order.level, rationale: `Grid level ${order.level} within range` }
      : { side: 'BUY', symbol, quoteAmount: order.quoteAmount, gridLevel: order.level, rationale: `Grid level ${order.level} within range` };
  }
  if (implementationKey === 'trend-following') {
    const strategy = createTrendStrategy('0.0.1', rawParameters as TrendParameters);
    const proposal = strategy.analyze({ candles, spentCapital: Number(runtime.spentCapital), positionQuantity: Number(runtime.positionQuantity), mode: 'PAPER' });
    const item = proposal[0];
    if (item?.side === 'BUY') return { side: 'BUY', symbol, quoteAmount: item.quoteAmount ?? 0, rationale: item.rationale };
    if (item?.side === 'SELL' && item.quantity !== undefined) return { side: 'SELL', symbol, quoteAmount: Number(runtime.positionQuantity) * Number(latest.close), quantity: item.quantity, rationale: item.rationale };
    return null;
  }
  if (implementationKey === 'breakout') {
    const result = analyzeBreakout(rawParameters as BreakoutParameters, { now: Date.now(), candles: candles.map(({ high, low, close, volume, openTime }) => ({ high, low, close, volume, openTime })), spentCapital: Number(runtime.spentCapital), lastTradeAt: runtime.lastTradeAt?.getTime() ?? null, positionQuantity: Number(runtime.positionQuantity), averageEntryPrice: Number(runtime.averageEntryPrice), mode: 'PAPER' });
    if ('proposals' in result) {
      const item = result.proposals[0];
      if (item?.side === 'SELL' && item.quantity !== undefined) return { side: 'SELL', symbol, quoteAmount: Number(runtime.positionQuantity) * Number(latest.close), quantity: item.quantity, rationale: item.rationale };
      if (item?.side === 'BUY' && item.quoteAmount !== undefined) return { side: 'BUY', symbol, quoteAmount: item.quoteAmount, rationale: item.rationale };
    }
  }
  return null;
}

async function markWaiting(database: PrismaClient, botId: string, reason: string): Promise<void> {
  const existing = typeof database.bot.findUnique === 'function'
    ? await database.bot.findUnique({ where: { id: botId }, select: { waitingSince: true } })
    : null;
  if (typeof database.bot.update === 'function') {
    await database.bot.update({ where: { id: botId }, data: { waitingReason: reason, waitingSince: existing?.waitingSince ?? new Date() } });
  }
  const knownReason = ['MARKET_REGIME_NOT_SUITABLE', 'INSUFFICIENT_MARKET_DATA', 'OUTSIDE_SCHEDULE', 'INTERVAL_NOT_REACHED', 'PRICE_OUT_OF_RANGE', 'CAPITAL_INSUFFICIENT'].includes(reason)
    ? reason as 'MARKET_REGIME_NOT_SUITABLE' | 'INSUFFICIENT_MARKET_DATA' | 'OUTSIDE_SCHEDULE' | 'INTERVAL_NOT_REACHED' | 'PRICE_OUT_OF_RANGE' | 'CAPITAL_INSUFFICIENT'
    : 'MARKET_REGIME_NOT_SUITABLE';
  await database.botEvent.create({ data: { botId, type: 'WAITING_FOR_MARKET', payload: noOp(knownReason, { reason }) } });
  if (existing) {
    const bot = await database.bot.findUnique({ where: { id: botId }, select: { userId: true, exchangeConnectionId: true } });
    if (bot) await notifyTrader(database, { userId: bot.userId, botId, connectionId: bot.exchangeConnectionId, type: 'TRADER_WAITING', title: 'Trader is waiting', body: `The trader is waiting: ${reason}`, data: { waitingReason: reason } });
  }
}

function waitingReasonForStrategy(implementationKey: string, rawParameters: unknown, runtime: TraderRuntimeContext, price: number): string {
  if (implementationKey !== 'dca') return 'MARKET_REGIME_NOT_SUITABLE';
  const parameters = rawParameters && typeof rawParameters === 'object' ? rawParameters as Partial<DcaParameters> : {};
  if (typeof parameters.maxCapital === 'number' && runtime.spentCapital.plus(String(parameters.quoteAmount ?? 0)).gt(String(parameters.maxCapital))) return 'CAPITAL_INSUFFICIENT';
  if (runtime.lastBuyAt && typeof parameters.intervalMs === 'number' && Date.now() - runtime.lastBuyAt.getTime() < parameters.intervalMs) return 'INTERVAL_NOT_REACHED';
  if (typeof parameters.minPrice === 'number' && price < parameters.minPrice) return 'PRICE_OUT_OF_RANGE';
  if (typeof parameters.maxPrice === 'number' && price > parameters.maxPrice) return 'PRICE_OUT_OF_RANGE';
  return 'MARKET_REGIME_NOT_SUITABLE';
}

async function ensureGridLevels(
  database: PrismaClient,
  botId: string,
  rawParameters: unknown,
  authorizedCapital: unknown,
  currentPrice: number,
  riskPreset?: string | null,
): Promise<Array<{ level: number; price: unknown; side: 'BUY' | 'SELL'; status: string }>> {
  if (typeof database.paperGridLevel?.findMany !== 'function') return [];
  const existing = await database.paperGridLevel.findMany({ where: { botId }, select: { level: true, price: true, side: true, status: true } });
  if (existing.length) return existing;
  const raw = rawParameters && typeof rawParameters === 'object' ? rawParameters as Partial<GridParameters> : {};
  const range = riskPreset === 'CONSERVATIVE' ? 0.08 : riskPreset === 'AGGRESSIVE' ? 0.20 : 0.12;
  const parameters: GridParameters = {
    symbol: typeof raw.symbol === 'string' ? raw.symbol : 'UNKNOWN',
    lowerPrice: Number.isFinite(raw.lowerPrice) && Number(raw.lowerPrice) > 0 && Number(raw.lowerPrice) < currentPrice ? Number(raw.lowerPrice) : currentPrice * (1 - range),
    upperPrice: Number.isFinite(raw.upperPrice) && Number(raw.upperPrice) > currentPrice * (1 - range) ? Number(raw.upperPrice) : currentPrice * (1 + range),
    levels: Number.isInteger(raw.levels) && Number(raw.levels) >= 2 ? Number(raw.levels) : 6,
    capital: Number.isFinite(raw.capital) && Number(raw.capital) > 0 ? Number(raw.capital) : Number(authorizedCapital),
    maxVolatility: Number.isFinite(raw.maxVolatility) && Number(raw.maxVolatility) >= 0 ? Number(raw.maxVolatility) : 100,
    referencePrice: currentPrice,
  };
  const orders = buildGridOrders(parameters, { price: currentPrice, volatility: 0, availableBalance: Number(authorizedCapital), mode: 'PAPER' });
  if (orders.length && typeof database.paperGridLevel.createMany === 'function') {
    await database.paperGridLevel.createMany({ data: orders.map((order) => ({ botId, level: order.level, price: order.price, side: order.side, status: 'OPEN' as const })) });
  }
  return orders.map((order) => ({ level: order.level, price: order.price, side: order.side, status: 'OPEN' }));
}

async function executePaperOrder(
  database: PrismaClient,
  botId: string,
  proposalId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quoteAmount: number,
  price: number,
  quoteCurrency: string,
  initialCapital: number,
  requestedQuantity?: number,
): Promise<void> {
  const priceDecimal = new Decimal(price);
  const requestedQuote = new Decimal(quoteAmount);
  const quantity = new Decimal(requestedQuantity ?? requestedQuote.dividedBy(priceDecimal));
  await database.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { tradeProposalId: proposalId },
      select: { id: true },
    });
    if (existing) return;
    await tx.paperBalance.upsert({
      where: { botId_asset: { botId, asset: quoteCurrency } },
      create: { botId, asset: quoteCurrency, free: initialCapital },
      update: {},
    });
    const base = baseAsset(symbol, quoteCurrency);
    const value = quantity.times(priceDecimal);
    const fee = value.times('0.001');
    let realizedPnl = new Decimal(0);
    if (side === 'BUY') {
      const spent = await tx.paperBalance.updateMany({
        where: { botId, asset: quoteCurrency, free: { gte: value.plus(fee) } },
        data: { free: { decrement: value.plus(fee) } },
      });
      if (spent.count !== 1) throw new Error('PAPER_INSUFFICIENT_BALANCE');
      await tx.paperBalance.upsert({
        where: { botId_asset: { botId, asset: base } },
        create: { botId, asset: base, free: quantity },
        update: { free: { increment: quantity } },
      });
      const position = await tx.position.findFirst({
        where: { botId, symbol, tradingMode: 'PAPER', status: 'OPEN' },
      });
      if (position) {
        const next = applySpotPositionFill(
          { quantity: new Decimal(position.quantity), averagePrice: new Decimal(position.averagePrice), realizedPnl: new Decimal(position.realizedPnl) },
          'BUY',
          quantity,
          priceDecimal,
        );
        await tx.position.update({ where: { id: position.id }, data: { quantity: next.quantity, averagePrice: next.averagePrice } });
      } else {
        await tx.position.create({
          data: {
            botId,
            tradingMode: 'PAPER',
            symbol,
            status: 'OPEN',
            quantity,
            averagePrice: priceDecimal,
            realizedPnl: 0,
            openedAt: new Date(),
          },
        });
      }
    } else {
      const position = await tx.position.findFirst({
        where: { botId, symbol, tradingMode: 'PAPER', status: 'OPEN' },
      });
      if (!position || new Decimal(position.quantity).lessThan(quantity))
        throw new Error('PAPER_INSUFFICIENT_POSITION');
      const sold = await tx.paperBalance.updateMany({
        where: { botId, asset: base, free: { gte: quantity } },
        data: { free: { decrement: quantity } },
      });
      if (sold.count !== 1) throw new Error('PAPER_INSUFFICIENT_BALANCE');
      await tx.paperBalance.upsert({
        where: { botId_asset: { botId, asset: quoteCurrency } },
        create: { botId, asset: quoteCurrency, free: value.minus(fee) },
        update: { free: { increment: value.minus(fee) } },
      });
      const remaining = new Decimal(position.quantity).minus(quantity);
      realizedPnl = priceDecimal.minus(position.averagePrice).times(quantity).minus(fee);
      await tx.position.update({
        where: { id: position.id },
        data: {
          quantity: remaining,
          realizedPnl: { increment: realizedPnl },
          status: remaining.isZero() ? 'CLOSED' : 'OPEN',
          closedAt: remaining.isZero() ? new Date() : null,
        },
      });
    }
    const order = await tx.order.create({
      data: {
        botId,
        tradeProposalId: proposalId,
        idempotencyKey: `paper:${proposalId}`,
        clientOrderId: `paper-${proposalId}`,
        tradingMode: 'PAPER',
        symbol,
        side,
        type: 'MARKET',
        status: 'FILLED',
        ...(side === 'SELL' ? { requestedQuantity: quantity } : { requestedQuoteAmount: value }),
        filledQuantity: quantity,
        averageFillPrice: priceDecimal,
        submittedAt: new Date(),
        completedAt: new Date(),
      },
    });
    await tx.trade.create({ data: { orderId: order.id, quantity, price: priceDecimal, realizedPnl, executedAt: new Date() } });
    await tx.paperCapitalReservation.updateMany({
      where: { proposalId, status: 'ACTIVE' },
      data: { status: 'CONSUMED' },
    });
  });
}

export async function reserveCapital(
  database: PrismaClient,
  botId: string,
  proposalId: string,
  limit: number,
  amount: number,
  side: 'BUY' | 'SELL' = 'BUY',
): Promise<boolean> {
  const reservationAmount = side === 'SELL' ? 0 : amount;
  return database.$transaction(async (tx) => {
    const existing = await tx.paperCapitalReservation.findUnique({ where: { proposalId } });
    if (existing) return existing.status === 'ACTIVE';
    if (typeof tx.paperCapitalAllocation.findUnique !== 'function') {
      await tx.paperCapitalAllocation.upsert({ where: { botId }, create: { botId, allocated: 0 }, update: {} });
      const available = await tx.paperCapitalAllocation.updateMany({ where: { botId, allocated: { lte: limit - reservationAmount } }, data: { allocated: { increment: reservationAmount } } });
      if (available.count !== 1) return false;
      const global = await tx.paperGlobalCapitalAllocation.updateMany({ where: { id: 'global', allocated: { lte: limit - reservationAmount } }, data: { allocated: { increment: reservationAmount } } });
      if (global.count !== 1) {
        await tx.paperCapitalAllocation.updateMany({ where: { botId, allocated: { gte: reservationAmount } }, data: { allocated: { decrement: reservationAmount } } });
        return false;
      }
      await tx.paperCapitalReservation.create({ data: { botId, proposalId, amount: reservationAmount } });
      return true;
    }
    const allocation = await tx.paperCapitalAllocation.findUnique({ where: { botId } });
    const active = await tx.paperCapitalReservation.aggregate({
      where: { botId, status: 'ACTIVE' },
      _sum: { amount: true },
    });
    const hardLimit = Number(allocation?.allocated ?? limit);
    const reserved = Number(active._sum.amount ?? 0);
    if (!allocation?.active || reserved + reservationAmount > hardLimit) return false;
    await tx.paperCapitalReservation.create({ data: { botId, proposalId, amount: reservationAmount } });
    return true;
  });
}
function baseAsset(symbol: string, quoteCurrency: string): string {
  if (!symbol.endsWith(quoteCurrency)) throw new Error('PAPER_SYMBOL_QUOTE_MISMATCH');
  return symbol.slice(0, -quoteCurrency.length);
}

async function complete(
  database: PrismaClient,
  botId: string,
  job: Job<WorkerJob>,
  reason: string,
) {
  await database.botEvent.create({
    data: { botId, type: 'CYCLE_COMPLETED', payload: { jobId: job.id, reason } },
  });
}
function dcaParameters(value: unknown, allowedSymbols: string[]): DcaParameters {
  const parameters = value && typeof value === 'object' ? (value as Partial<DcaParameters>) : {};
  return {
    symbol:
      typeof parameters.symbol === 'string' &&
      allowedSymbols.includes(parameters.symbol.toUpperCase())
        ? parameters.symbol.toUpperCase()
        : (allowedSymbols[0] ?? ''),
    intervalMs: typeof parameters.intervalMs === 'number' ? parameters.intervalMs : 86_400_000,
    quoteAmount: typeof parameters.quoteAmount === 'number' ? parameters.quoteAmount : 0,
    maxCapital: typeof parameters.maxCapital === 'number' ? parameters.maxCapital : 0,
    ...(typeof parameters.minPrice === 'number' ? { minPrice: parameters.minPrice } : {}),
    ...(typeof parameters.maxPrice === 'number' ? { maxPrice: parameters.maxPrice } : {}),
  };
}
function correlationId(jobId: string): string {
  const hex = createHash('sha256').update(`paper-cycle:${jobId}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}
function safeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 240) : 'Unknown cycle error';
}
