import { createHash } from 'node:crypto';
import { createDcaStrategy, type DcaParameters } from '@risexpto/strategy-dca';
import { RiskEngine } from '@risexpto/risk-engine';
import type { PrismaClient } from '@risexpto/database';
import type { Job } from 'bullmq';
import type { WorkerJob } from './queue.js';

export async function processPaperCycle(database: PrismaClient, job: Job<WorkerJob>): Promise<void> {
  if (job.data.type !== 'bot-cycle' || !job.data.botId) return;
  const bot = await database.bot.findFirst({
    where: { id: job.data.botId, tradingMode: 'PAPER', status: 'RUNNING', archivedAt: null },
    include: { configuration: true, strategyVersion: { include: { definition: true } } },
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
      data: { botId: bot.id, type: 'CYCLE_BLOCKED', payload: { jobId: job.id, scope: killSwitch.scope, reason: killSwitch.reason } },
    });
    return;
  }
  await database.botEvent.create({
    data: { botId: bot.id, type: 'CYCLE_STARTED', payload: { jobId: job.id } },
  });
  try {
    if (bot.strategyVersion.implementationKey !== 'dca') {
      await complete(database, bot.id, job, 'UNSUPPORTED_STRATEGY');
      return;
    }
    const parameters = dcaParameters(bot.configuration.parameters, bot.configuration.allowedSymbols);
    const market = await database.marketSnapshot.findFirst({
      where: { symbol: parameters.symbol }, orderBy: { closeTime: 'desc' },
      select: { close: true, closeTime: true },
    });
    if (!market) {
      await complete(database, bot.id, job, 'MARKET_DATA_UNAVAILABLE');
      return;
    }
    const proposal = createDcaStrategy(`0.0.${bot.strategyVersion.version}`, parameters).analyze({
      now: Date.now(), lastPurchaseAt: null, spentCapital: 0, price: Number(market.close), mode: 'PAPER',
    })[0];
    if (!proposal) {
      await complete(database, bot.id, job, 'STRATEGY_NO_SIGNAL');
      return;
    }
    const id = correlationId(String(job.id));
    await database.tradeProposal.upsert({
      where: { botId_correlationId: { botId: bot.id, correlationId: id } },
      create: {
        botId: bot.id, strategyVersionId: bot.strategyVersionId, correlationId: id,
        symbol: proposal.symbol, side: proposal.side, orderType: 'MARKET', quoteAmount: proposal.quoteAmount,
        rationale: { text: proposal.rationale, marketCloseTime: market.closeTime.toISOString() },
      }, update: {},
    });
    const storedProposal = await database.tradeProposal.findUniqueOrThrow({
      where: { botId_correlationId: { botId: bot.id, correlationId: id } },
    });
    const profile = await database.riskProfile.findUnique({ where: { botId: bot.id } });
    if (!profile) {
      await database.riskEvent.create({ data: {
        botId: bot.id, tradeProposalId: storedProposal.id, decision: 'REJECTED',
        reasonCode: 'RISK_PROFILE_MISSING', reason: 'Bot has no configured risk profile.', riskSnapshot: {},
      } });
      await database.tradeProposal.update({ where: { id: storedProposal.id }, data: { status: 'REJECTED', decidedAt: new Date() } });
      await complete(database, bot.id, job, 'RISK_REJECTED');
      return;
    }
    const risk = new RiskEngine({
      maxAllocatedCapital: Number(profile.maxAllocatedCapital), maxTradeAmount: Number(profile.maxTradeAmount),
      maxExposure: Number(profile.maxAllocatedCapital) * Number(profile.maxExposurePercent),
      maxPositionPercent: Number(profile.maxPositionPercent), maxPositions: profile.maxPositions,
      maxDailyLoss: Number(profile.maxDailyLossPercent), maxDrawdown: Number(profile.maxDrawdownPercent),
      allowedSymbols: profile.allowedSymbols, cooldownMs: profile.cooldownSeconds * 1000, allowLive: false,
    }).evaluate({
      symbol: proposal.symbol, amount: Number(proposal.quoteAmount) / Number(market.close), price: Number(market.close),
      availableBalance: Number(profile.maxAllocatedCapital), allocatedCapital: 0, currentExposure: 0,
      positionValue: 0, openPositions: 0, dailyLoss: 0, drawdown: 0, lastTradeAt: null,
      botStatus: 'RUNNING', tradingMode: bot.tradingMode,
    });
    if (risk.decision === 'APPROVED') {
      const reserved = await reserveCapital(database, bot.id, storedProposal.id, Number(profile.maxAllocatedCapital), Number(proposal.quoteAmount));
      if (!reserved) {
        risk.decision = 'REJECTED';
        risk.reasonCode = 'CAPITAL_RESERVATION_CONFLICT';
        risk.reason = 'Capital is already reserved by another concurrent cycle.';
      }
    }
    await database.riskEvent.create({ data: {
      botId: bot.id, riskProfileId: profile.id, tradeProposalId: storedProposal.id,
      decision: risk.decision, reasonCode: risk.reasonCode, reason: risk.reason, riskSnapshot: risk.riskSnapshot,
    } });
    await database.tradeProposal.update({ where: { id: storedProposal.id }, data: {
      status: risk.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED', decidedAt: new Date(),
    } });
    if (risk.decision === 'APPROVED') {
      await executePaperOrder(
        database, bot.id, storedProposal.id, proposal.symbol, proposal.side,
        Number(proposal.quoteAmount), Number(market.close), bot.configuration.quoteCurrency,
        Number(bot.configuration.authorizedCapital),
      );
      await database.tradeProposal.update({ where: { id: storedProposal.id }, data: { status: 'EXECUTED' } });
    }
    await complete(database, bot.id, job, risk.decision === 'APPROVED' ? 'RISK_APPROVED' : 'RISK_REJECTED');
  } catch (error) {
    await database.botEvent.create({ data: { botId: bot.id, type: 'CYCLE_FAILED', payload: { jobId: job.id, error: safeError(error) } } });
    throw error;
  }
}

async function executePaperOrder(
  database: PrismaClient, botId: string, proposalId: string, symbol: string, side: 'BUY' | 'SELL',
  quoteAmount: number, price: number, quoteCurrency: string, initialCapital: number,
): Promise<void> {
  const quantity = quoteAmount / price;
  await database.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { tradeProposalId: proposalId }, select: { id: true } });
    if (existing) return;
    await tx.paperBalance.upsert({
      where: { botId_asset: { botId, asset: quoteCurrency } },
      create: { botId, asset: quoteCurrency, free: initialCapital }, update: {},
    });
    const base = baseAsset(symbol, quoteCurrency);
    const fee = quoteAmount * 0.001;
    if (side === 'BUY') {
      const spent = await tx.paperBalance.updateMany({
        where: { botId, asset: quoteCurrency, free: { gte: quoteAmount + fee } },
        data: { free: { decrement: quoteAmount + fee } },
      });
      if (spent.count !== 1) throw new Error('PAPER_INSUFFICIENT_BALANCE');
      await tx.paperBalance.upsert({
        where: { botId_asset: { botId, asset: base } },
        create: { botId, asset: base, free: quantity }, update: { free: { increment: quantity } },
      });
    } else {
      const position = await tx.position.findFirst({ where: { botId, symbol, tradingMode: 'PAPER', status: 'OPEN' } });
      if (!position || Number(position.quantity) < quantity) throw new Error('PAPER_INSUFFICIENT_POSITION');
      const sold = await tx.paperBalance.updateMany({
        where: { botId, asset: base, free: { gte: quantity } }, data: { free: { decrement: quantity } },
      });
      if (sold.count !== 1) throw new Error('PAPER_INSUFFICIENT_BALANCE');
      await tx.paperBalance.upsert({
        where: { botId_asset: { botId, asset: quoteCurrency } },
        create: { botId, asset: quoteCurrency, free: quoteAmount - fee }, update: { free: { increment: quoteAmount - fee } },
      });
      const remaining = Number(position.quantity) - quantity;
      await tx.position.update({ where: { id: position.id }, data: {
        quantity: remaining, realizedPnl: { increment: (price - Number(position.averagePrice)) * quantity - fee },
        status: remaining === 0 ? 'CLOSED' : 'OPEN', closedAt: remaining === 0 ? new Date() : null,
      } });
    }
    const order = await tx.order.create({ data: {
      botId, tradeProposalId: proposalId, idempotencyKey: `paper:${proposalId}`,
      clientOrderId: `paper-${proposalId}`, tradingMode: 'PAPER', symbol, side, type: 'MARKET',
      status: 'FILLED', requestedQuantity: quantity, requestedQuoteAmount: quoteAmount,
      filledQuantity: quantity, averageFillPrice: price, submittedAt: new Date(), completedAt: new Date(),
    } });
    await tx.trade.create({ data: { orderId: order.id, quantity, price, executedAt: new Date() } });
    await tx.paperCapitalAllocation.updateMany({
      where: { botId, allocated: { gte: quoteAmount } }, data: { allocated: { decrement: quoteAmount } },
    });
    await tx.paperGlobalCapitalAllocation.updateMany({
      where: { id: 'global', allocated: { gte: quoteAmount } }, data: { allocated: { decrement: quoteAmount } },
    });
    await tx.paperCapitalReservation.updateMany({
      where: { proposalId, status: 'ACTIVE' }, data: { status: 'CONSUMED' },
    });
    const position = await tx.position.findFirst({ where: { botId, symbol, tradingMode: 'PAPER', status: 'OPEN' } });
    if (position && side === 'BUY') {
      const nextQuantity = Number(position.quantity) + quantity;
      await tx.position.update({ where: { id: position.id }, data: {
        quantity: nextQuantity, averagePrice: (Number(position.averagePrice) * Number(position.quantity) + quoteAmount) / nextQuantity,
      } });
    } else if (!position && side === 'BUY') {
      await tx.position.create({ data: {
        botId, tradingMode: 'PAPER', symbol, status: 'OPEN', quantity, averagePrice: price,
        realizedPnl: 0, openedAt: new Date(),
      } });
    }
  });
}

async function reserveCapital(database: PrismaClient, botId: string, proposalId: string, limit: number, amount: number): Promise<boolean> {
  return database.$transaction(async (tx) => {
    const existing = await tx.paperCapitalReservation.findUnique({ where: { proposalId } });
    if (existing) return existing.status === 'ACTIVE';
    await tx.paperCapitalAllocation.upsert({
      where: { botId }, create: { botId, allocated: 0 }, update: {},
    });
    const available = await tx.paperCapitalAllocation.updateMany({
      where: { botId, allocated: { lte: limit - amount } }, data: { allocated: { increment: amount } },
    });
    if (available.count !== 1) return false;
    const activePaperBots = await tx.botConfiguration.aggregate({
      where: { bot: { status: 'RUNNING', tradingMode: 'PAPER', archivedAt: null } },
      _sum: { authorizedCapital: true },
    });
    const globalLimit = Number(activePaperBots._sum.authorizedCapital ?? 0);
    await tx.paperGlobalCapitalAllocation.upsert({
      where: { id: 'global' }, create: { id: 'global', allocated: 0 }, update: {},
    });
    const globalAvailable = await tx.paperGlobalCapitalAllocation.updateMany({
      where: { id: 'global', allocated: { lte: globalLimit - amount } },
      data: { allocated: { increment: amount } },
    });
    if (globalAvailable.count !== 1) {
      await tx.paperCapitalAllocation.updateMany({
        where: { botId, allocated: { gte: amount } }, data: { allocated: { decrement: amount } },
      });
      return false;
    }
    await tx.paperCapitalReservation.create({ data: { botId, proposalId, amount } });
    return true;
  });
}
function baseAsset(symbol: string, quoteCurrency: string): string {
  if (!symbol.endsWith(quoteCurrency)) throw new Error('PAPER_SYMBOL_QUOTE_MISMATCH');
  return symbol.slice(0, -quoteCurrency.length);
}

async function complete(database: PrismaClient, botId: string, job: Job<WorkerJob>, reason: string) {
  await database.botEvent.create({ data: { botId, type: 'CYCLE_COMPLETED', payload: { jobId: job.id, reason } } });
}
function dcaParameters(value: unknown, allowedSymbols: string[]): DcaParameters {
  const parameters = value && typeof value === 'object' ? value as Partial<DcaParameters> : {};
  return {
    symbol: typeof parameters.symbol === 'string' && allowedSymbols.includes(parameters.symbol.toUpperCase()) ? parameters.symbol.toUpperCase() : allowedSymbols[0] ?? '',
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
function safeError(error: unknown): string { return error instanceof Error ? error.message.slice(0, 240) : 'Unknown cycle error'; }
