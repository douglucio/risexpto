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
    await database.riskEvent.create({ data: {
      botId: bot.id, riskProfileId: profile.id, tradeProposalId: storedProposal.id,
      decision: risk.decision, reasonCode: risk.reasonCode, reason: risk.reason, riskSnapshot: risk.riskSnapshot,
    } });
    await database.tradeProposal.update({ where: { id: storedProposal.id }, data: {
      status: risk.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED', decidedAt: new Date(),
    } });
    await complete(database, bot.id, job, risk.decision === 'APPROVED' ? 'RISK_APPROVED' : 'RISK_REJECTED');
  } catch (error) {
    await database.botEvent.create({ data: { botId: bot.id, type: 'CYCLE_FAILED', payload: { jobId: job.id, error: safeError(error) } } });
    throw error;
  }
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
