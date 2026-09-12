import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma, PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { BotStatusChange, CreateBotBody, RiskProfileBody, StopModeChange } from './bots.types';
import { BillingService } from '../billing/billing.service';
import { cryptoDigitalTraders, mapBotState, runtimeExecutionProfileForTrader, type CapitalMode, type RiskPreset } from '@risexpto/digital-traders';
import { Decimal } from 'decimal.js';

@Injectable()
export class BotsService {
  constructor(
    @Inject(DATABASE) private readonly db: PrismaClient,
    @Optional() private readonly billing?: BillingService,
  ) {}

  async list(user: AuthenticatedUser) {
    const bots = await this.db.bot.findMany({
      where: { userId: applicationUserId(user), archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        configuration: true,
        riskProfile: true,
        exchangeConnection: { select: { provider: true, label: true } },
        positions: { select: { symbol: true, quantity: true, averagePrice: true, realizedPnl: true, status: true, openedAt: true } },
      },
    });
    return Promise.all(bots.map(async (bot) => {
      const realized = bot.positions.reduce((sum, position) => sum.plus(position.realizedPnl), new Decimal(0));
      const price = bot.assetSymbol ? await this.db.marketSnapshot.findFirst({ where: { symbol: bot.assetSymbol }, orderBy: { closeTime: 'desc' }, select: { close: true } }) : null;
      const openPositions = bot.positions.filter((position) => position.status === 'OPEN');
      const exposure = openPositions.reduce((sum, position) => sum.plus(new Decimal(position.quantity).times(price?.close ?? position.averagePrice)), new Decimal(0));
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const todayTrades = await this.db.trade.aggregate({ where: { order: { botId: bot.id, tradingMode: bot.tradingMode }, executedAt: { gte: today } }, _sum: { realizedPnl: true } });
      const todayRealized = new Decimal(todayTrades._sum.realizedPnl ?? 0);
      const unrealized = openPositions.reduce((sum, position) => sum.plus(new Decimal(price?.close ?? position.averagePrice).minus(position.averagePrice).times(position.quantity)), new Decimal(0));
      const todayUnrealized = await openPositions.reduce(async (pending, position) => {
        const sum = await pending;
        const currentPrice = new Decimal(price?.close ?? position.averagePrice);
        const current = currentPrice.minus(position.averagePrice).times(position.quantity);
        if (position.openedAt >= today) return sum.plus(current);
        const dayStart = await this.db.marketSnapshot.findFirst({ where: { symbol: position.symbol, closeTime: { lte: today } }, orderBy: { closeTime: 'desc' }, select: { close: true } });
        const baseline = dayStart ? new Decimal(dayStart.close).minus(position.averagePrice).times(position.quantity) : new Decimal(0);
        return sum.plus(current.minus(baseline));
      }, Promise.resolve(new Decimal(0)));
      return {
        ...bot,
        productState: mapBotState(bot.status, bot.waitingReason),
        realizedPnl: realized.toString(),
        unrealizedPnl: unrealized.toString(),
        currentExposure: exposure.toString(),
        totalPnl: Number(realized.plus(unrealized)),
        todayRealizedPnl: todayRealized.toString(),
        todayUnrealizedPnl: todayUnrealized.toString(),
        todayPnl: Number(todayRealized.plus(todayUnrealized)),
      };
    }));
  }

  async get(user: AuthenticatedUser, id: string) {
    const bot = await this.db.bot.findFirst({
      where: { id, userId: applicationUserId(user), archivedAt: null },
      include: { configuration: true },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  async activity(user: AuthenticatedUser, id: string, rawLimit?: string, rawOffset?: string) {
    const bot = await this.db.bot.findFirst({ where: { id, userId: applicationUserId(user), archivedAt: null }, select: { id: true } });
    if (!bot) throw new NotFoundException('Bot not found');
    const take = Math.min(100, Math.max(1, Number(rawLimit ?? 50) || 50));
    const skip = Math.max(0, Number(rawOffset ?? 0) || 0);
    return this.db.botEvent.findMany({ where: { botId: id }, orderBy: { createdAt: 'desc' }, take, skip });
  }

  async create(user: AuthenticatedUser, body: CreateBotBody) {
    const userId = applicationUserId(user);
    if (this.billing) await this.billing.assertCanCreateBot(user, body.tradingMode === 'LIVE' ? 'LIVE' : 'PAPER');
    const input = parseCreateBody(body, userId);
    const strategy = await this.db.strategyVersion.findFirst({
      where: { id: input.strategyVersionId, active: true, definition: { active: true } },
      select: { id: true },
    });
    if (!strategy) throw new BadRequestException('Active strategy version not found');
    if (input.exchangeConnectionId) {
      const connection = await this.db.exchangeConnection.findFirst({
        where: { id: input.exchangeConnectionId, userId, revokedAt: null },
        select: { id: true },
      });
      if (!connection) throw new BadRequestException('Exchange connection not found');
    }
    try {
      return await this.db.$transaction(async (tx) => {
        const paperPortfolio = input.tradingMode === 'PAPER' && typeof tx.paperPortfolio?.upsert === 'function'
          ? await tx.paperPortfolio.upsert({
              where: { userId_provider_baseCurrency: { userId, provider: 'BINANCE', baseCurrency: input.quoteCurrency } },
              create: { userId, provider: 'BINANCE', baseCurrency: input.quoteCurrency },
              update: {},
            })
          : null;
        return tx.bot.create({
          data: {
            userId,
            name: input.name,
            strategyVersionId: input.strategyVersionId,
            tradingMode: input.tradingMode,
            capitalMode: input.capitalMode,
            assetSymbol: input.assetSymbol,
            ...(input.digitalTraderSlug ? { digitalTraderSlug: input.digitalTraderSlug } : {}),
            ...(input.exchangeConnectionId
              ? { exchangeConnectionId: input.exchangeConnectionId }
              : {}),
            ...(paperPortfolio ? { paperPortfolioId: paperPortfolio.id } : {}),
            configuration: {
              create: {
                parameters: input.parameters as Prisma.InputJsonValue,
                allowedSymbols: input.allowedSymbols,
                authorizedCapital: input.authorizedCapital,
                quoteCurrency: input.quoteCurrency,
                evaluationIntervalMs: input.evaluationIntervalMs,
                marketDataTimeframe: input.marketDataTimeframe,
                historyDepth: input.historyDepth,
                minimumCandles: input.minimumCandles,
              },
            },
            riskProfile: { create: input.riskProfile },
            ...(input.tradingMode === 'PAPER'
              ? { paperCapitalAllocation: { create: { allocated: 0, ...(paperPortfolio ? { paperPortfolioId: paperPortfolio.id } : {}) } } }
              : {}),
          },
          include: { configuration: true, riskProfile: true },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Bot name already exists');
      throw error;
    }
  }

  async changeStatus(user: AuthenticatedUser, id: string, status: BotStatusChange, stopMode?: StopModeChange) {
    const bot = await this.get(user, id);
    const allowed: Record<string, readonly string[]> = {
      DRAFT: ['READY'],
      READY: ['RUNNING'],
      RUNNING: ['PAUSED', 'STOPPED'],
      PAUSED: ['RUNNING', 'STOPPED'],
      RISK_BLOCKED: ['RUNNING', 'PAUSED', 'STOPPED'],
      STOPPED: ['READY'],
    };
    if (!allowed[bot.status]?.includes(status))
      throw new ConflictException(`Invalid bot transition: ${bot.status} to ${status}`);
    if (typeof this.db.$transaction !== 'function')
      return this.db.bot.update({ where: { id: bot.id }, data: { status } });
    const stopPrice = status === 'STOPPED' && stopMode === 'STOP_AND_LIQUIDATE' && bot.assetSymbol
      ? await this.db.marketSnapshot.findFirst({ where: { symbol: bot.assetSymbol }, orderBy: { closeTime: 'desc' }, select: { close: true } })
      : null;
    return this.db.$transaction(async (tx) => {
      if (bot.tradingMode === 'PAPER' && bot.configuration && typeof tx.paperCapitalAllocation?.update === 'function') {
        const allocation = await tx.paperCapitalAllocation.findUnique({ where: { botId: bot.id } });
        if (status === 'RUNNING' && !allocation?.active) {
          const portfolio = bot.paperPortfolioId && typeof tx.paperPortfolio?.update === 'function'
            ? await tx.paperPortfolio.findUnique({ where: { id: bot.paperPortfolioId } })
            : null;
          if (portfolio) {
            // availableCapital is already the free cash balance. Subtracting
            // allocatedCapital here double-counts every previous allocation.
            const available = portfolio.availableCapital;
            if (available.lessThan(bot.configuration.authorizedCapital))
              throw new ConflictException('Paper portfolio capital allocation is unavailable');
            const claimed = typeof tx.paperPortfolio.updateMany === 'function'
              ? await tx.paperPortfolio.updateMany({
                  where: { id: portfolio.id, availableCapital: { gte: bot.configuration.authorizedCapital } },
                  data: { allocatedCapital: { increment: bot.configuration.authorizedCapital }, availableCapital: { decrement: bot.configuration.authorizedCapital } },
                })
              : { count: 1 };
            if (claimed.count !== 1) throw new ConflictException('Paper portfolio capital allocation is unavailable');
            if (typeof tx.paperPortfolio.updateMany !== 'function') await tx.paperPortfolio.update({ where: { id: portfolio.id }, data: { allocatedCapital: { increment: bot.configuration.authorizedCapital }, availableCapital: { decrement: bot.configuration.authorizedCapital } } });
          }
          await tx.paperCapitalAllocation.upsert({ where: { botId: bot.id }, create: { botId: bot.id, paperPortfolioId: bot.paperPortfolioId, allocated: bot.configuration.authorizedCapital, active: true }, update: { allocated: bot.configuration.authorizedCapital, active: true, releasedAt: null } });
          if (typeof tx.paperBalance?.upsert === 'function') {
            await tx.paperBalance.upsert({
              where: { botId_asset: { botId: bot.id, asset: bot.configuration.quoteCurrency } },
              create: { botId: bot.id, asset: bot.configuration.quoteCurrency, free: bot.configuration.authorizedCapital, locked: 0 },
              update: {},
            });
          }
        }
        if (status === 'STOPPED' && allocation?.active) {
          const mode = stopMode ?? 'STOP_AND_KEEP_ASSETS';
          const positions = typeof tx.position?.findMany === 'function'
            ? await tx.position.findMany({ where: { botId: bot.id, tradingMode: 'PAPER', status: 'OPEN', managed: true } })
            : [];
          let retainedCapital = new Decimal(0);
          if (mode === 'STOP_AND_LIQUIDATE' && positions.length > 0) {
            if (!stopPrice) throw new ConflictException('Paper liquidation requires a current market price');
            for (const position of positions) {
              const quantity = new Decimal(position.quantity);
              const price = new Decimal(stopPrice.close);
              const value = quantity.times(price);
              const fee = value.times('0.001');
              const realized = price.minus(position.averagePrice).times(quantity).minus(fee);
              const base = baseAssetFor(position.symbol, bot.configuration.quoteCurrency);
              const sold = await tx.paperBalance.updateMany({ where: { botId: bot.id, asset: base, free: { gte: quantity } }, data: { free: { decrement: quantity } } });
              if (sold.count !== 1) throw new ConflictException('Paper liquidation balance is unavailable');
              await tx.paperBalance.upsert({ where: { botId_asset: { botId: bot.id, asset: bot.configuration.quoteCurrency } }, create: { botId: bot.id, asset: bot.configuration.quoteCurrency, free: value.minus(fee), locked: 0 }, update: { free: { increment: value.minus(fee) } } });
              const proposal = await tx.tradeProposal.create({ data: { botId: bot.id, strategyVersionId: bot.strategyVersionId, correlationId: randomUUID(), symbol: position.symbol, side: 'SELL', orderType: 'MARKET', quantity, quoteAmount: value, rationale: { reason: 'STOP_AND_LIQUIDATE' }, status: 'EXECUTED', decidedAt: new Date() } });
              const order = await tx.order.create({ data: { botId: bot.id, tradeProposalId: proposal.id, idempotencyKey: `paper-stop:${proposal.id}`, clientOrderId: `paper-stop-${proposal.id}`, tradingMode: 'PAPER', symbol: position.symbol, side: 'SELL', type: 'MARKET', status: 'FILLED', requestedQuantity: quantity, requestedQuoteAmount: value, filledQuantity: quantity, averageFillPrice: price, submittedAt: new Date(), completedAt: new Date() } });
              await tx.trade.create({ data: { orderId: order.id, quantity, price, fee, realizedPnl: realized, executedAt: new Date() } });
              await tx.position.update({ where: { id: position.id }, data: { quantity: 0, realizedPnl: { increment: realized }, status: 'CLOSED', managed: true, closedAt: new Date() } });
            }
          } else {
            for (const position of positions) {
              retainedCapital = retainedCapital.plus(new Decimal(position.quantity).times(position.averagePrice));
              if (typeof tx.unmanagedHolding?.create === 'function') await tx.unmanagedHolding.create({ data: { userId: bot.userId, paperPortfolioId: bot.paperPortfolioId!, originBotInstanceId: bot.id, symbol: position.symbol, quantity: position.quantity, averagePrice: position.averagePrice, costBasis: new Decimal(position.quantity).times(position.averagePrice) } });
              await tx.position.update({ where: { id: position.id }, data: { managed: false } });
            }
          }
          const releasable = Decimal.max(0, new Decimal(allocation.allocated).minus(retainedCapital));
          if (bot.paperPortfolioId && typeof tx.paperPortfolio?.update === 'function') await tx.paperPortfolio.update({ where: { id: bot.paperPortfolioId }, data: { allocatedCapital: { decrement: releasable }, availableCapital: { increment: releasable } } });
          await tx.paperCapitalAllocation.update({ where: { botId: bot.id }, data: { active: false, allocated: 0, releasedAt: new Date() } });
        }
      } else if (status === 'RUNNING' && bot.exchangeConnectionId && bot.configuration) {
        const result = await tx.$executeRaw`
          UPDATE "ExchangeConnection"
          SET "allocatedCapital" = "allocatedCapital" + ${bot.configuration.authorizedCapital}
          WHERE "id" = ${bot.exchangeConnectionId}
            AND ("availableCapital" = 0 OR "allocatedCapital" + ${bot.configuration.authorizedCapital} <= "availableCapital")
            AND "killSwitchActive" = false`;
        if (result !== 1) throw new ConflictException('Connection capital allocation is unavailable');
      }
      if (bot.tradingMode !== 'PAPER' && status === 'STOPPED' && bot.exchangeConnectionId && bot.configuration) {
        await tx.$executeRaw`
          UPDATE "ExchangeConnection"
          SET "allocatedCapital" = GREATEST(0, "allocatedCapital" - ${bot.configuration.authorizedCapital})
          WHERE "id" = ${bot.exchangeConnectionId}`;
      }
      return tx.bot.update({ where: { id: bot.id }, data: { status, ...(status === 'STOPPED' ? { stopMode: stopMode ?? 'STOP_AND_KEEP_ASSETS', stopRequestedAt: new Date() } : {}) } });
    });
  }

  async riskProfile(user: AuthenticatedUser, id: string) {
    const bot = await this.db.bot.findFirst({
      where: { id, userId: applicationUserId(user), archivedAt: null },
      select: { riskProfile: true },
    });
    if (!bot?.riskProfile) throw new NotFoundException('Risk profile not found');
    return bot.riskProfile;
  }

  async updateRiskProfile(user: AuthenticatedUser, id: string, body: RiskProfileBody) {
    const userId = applicationUserId(user);
    const bot = await this.db.bot.findFirst({
      where: { id, userId, archivedAt: null },
      select: {
        id: true,
        status: true,
        configuration: { select: { authorizedCapital: true, allowedSymbols: true } },
        riskProfile: true,
      },
    });
    if (!bot?.configuration || !bot.riskProfile)
      throw new NotFoundException('Bot or risk profile not found');
    if (bot.status === 'RUNNING')
      throw new ConflictException('Pause the bot before changing risk limits');
    const input = parseRiskProfile(
      {
        name: bot.riskProfile.name,
        maxAllocatedCapital: bot.riskProfile.maxAllocatedCapital.toString(),
        maxTradeAmount: bot.riskProfile.maxTradeAmount.toString(),
        maxExposurePercent: bot.riskProfile.maxExposurePercent.toString(),
        maxPositionPercent: bot.riskProfile.maxPositionPercent.toString(),
        maxPositions: bot.riskProfile.maxPositions,
        maxDailyLossPercent: bot.riskProfile.maxDailyLossPercent.toString(),
        maxDrawdownPercent: bot.riskProfile.maxDrawdownPercent.toString(),
        allowedSymbols: bot.riskProfile.allowedSymbols,
        cooldownSeconds: bot.riskProfile.cooldownSeconds,
        ...body,
      },
      userId,
      bot.configuration.authorizedCapital.toString(),
      bot.configuration.allowedSymbols,
    );
    return this.db.riskProfile.update({ where: { botId: bot.id }, data: input });
  }
}

function applicationUserId(user: AuthenticatedUser): string {
  if (!user.applicationUserId) throw new ConflictException('Application user is not provisioned');
  return user.applicationUserId;
}

function baseAssetFor(symbol: string, quoteCurrency: string): string {
  const quote = quoteCurrency.toUpperCase();
  return symbol.toUpperCase().endsWith(quote) ? symbol.slice(0, -quote.length) : symbol;
}

function parseCreateBody(body: CreateBotBody, userId: string) {
  const name = text(body.name, 'name', 120);
  const strategyVersionId = uuid(body.strategyVersionId, 'strategyVersionId');
  const tradingMode: 'PAPER' | 'LIVE' | null =
    body.tradingMode === 'LIVE' ? 'LIVE' : body.tradingMode === 'PAPER' ? 'PAPER' : null;
  if (!tradingMode) throw new BadRequestException('tradingMode must be PAPER or LIVE');
  const exchangeConnectionId = body.exchangeConnectionId
    ? uuid(body.exchangeConnectionId, 'exchangeConnectionId')
    : null;
  if (tradingMode === 'LIVE')
    throw new BadRequestException('LIVE trading is not enabled by this endpoint');
  if (!Array.isArray(body.allowedSymbols) || body.allowedSymbols.length === 0)
    throw new BadRequestException('allowedSymbols is required');
  const allowedSymbols = body.allowedSymbols.map((symbol) =>
    text(symbol, 'allowedSymbols', 20).toUpperCase(),
  );
  if (new Set(allowedSymbols).size !== 1) throw new BadRequestException('A Trader Instance supports exactly one asset');
  const capitalMode: CapitalMode = body.capitalMode === 'COMPOUND' ? 'COMPOUND' : 'FIXED';
  const digitalTraderSlug = body.digitalTraderSlug === undefined ? undefined : text(body.digitalTraderSlug, 'digitalTraderSlug', 80).toLowerCase();
  if (digitalTraderSlug && !cryptoDigitalTraders.some((trader) => trader.slug === digitalTraderSlug)) throw new BadRequestException('Unknown Digital Trader');
  if (!allowedSymbols.every((symbol) => /^[A-Z0-9]{5,20}$/.test(symbol)))
    throw new BadRequestException('Invalid allowedSymbols');
  const authorizedCapital = decimal(body.authorizedCapital, 'authorizedCapital');
  const quoteCurrency = text(body.quoteCurrency, 'quoteCurrency', 16).toUpperCase();
  if (!/^[A-Z]{3,16}$/.test(quoteCurrency)) throw new BadRequestException('Invalid quoteCurrency');
  const executionProfile = runtimeExecutionProfileForTrader(digitalTraderSlug);
  const evaluationIntervalMs = boundedInt(body.evaluationIntervalMs ?? executionProfile.evaluationIntervalMs, 'evaluationIntervalMs', 1_000, 86_400_000);
  const marketDataTimeframe = text(body.marketDataTimeframe ?? executionProfile.marketDataTimeframe, 'marketDataTimeframe', 12);
  const historyDepth = boundedInt(body.historyDepth ?? executionProfile.historyDepth, 'historyDepth', 1, 2_000);
  const minimumCandles = boundedInt(body.minimumCandles ?? executionProfile.minimumCandles, 'minimumCandles', 1, historyDepth);
  return {
    name,
    strategyVersionId,
    tradingMode,
    capitalMode,
    assetSymbol: allowedSymbols[0]!,
    digitalTraderSlug,
    exchangeConnectionId,
    parameters: isRecord(body.parameters) ? body.parameters : {},
    allowedSymbols: [...new Set(allowedSymbols)],
    authorizedCapital,
    quoteCurrency,
    evaluationIntervalMs,
    marketDataTimeframe,
    historyDepth,
    minimumCandles,
    riskProfile: parseRiskProfile(body.riskProfile, userId, authorizedCapital, [
      ...new Set(allowedSymbols),
    ]),
  };
}

function boundedInt(value: unknown, field: string, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new BadRequestException(`${field} must be an integer between ${min} and ${max}`);
  return parsed;
}

function parseRiskProfile(
  value: unknown,
  userId: string,
  authorizedCapital: string,
  botSymbols: string[],
) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('riskProfile is required');
  const body = value as RiskProfileBody;
  const name = text(body.name ?? 'Default risk', 'riskProfile.name', 100);
  const maxAllocatedCapital = decimal(body.maxAllocatedCapital, 'riskProfile.maxAllocatedCapital');
  const maxTradeAmount = decimal(body.maxTradeAmount, 'riskProfile.maxTradeAmount');
  const maxExposurePercent = percentage(body.maxExposurePercent, 'riskProfile.maxExposurePercent');
  const maxPositionPercent = percentage(body.maxPositionPercent, 'riskProfile.maxPositionPercent');
  const maxDailyLossPercent = percentage(
    body.maxDailyLossPercent,
    'riskProfile.maxDailyLossPercent',
  );
  const maxDrawdownPercent = percentage(body.maxDrawdownPercent, 'riskProfile.maxDrawdownPercent');
  const maxPositions = positiveInt(body.maxPositions, 'riskProfile.maxPositions');
  const cooldownSeconds = nonNegativeInt(body.cooldownSeconds ?? 0, 'riskProfile.cooldownSeconds');
  if (
    Number(maxAllocatedCapital) > Number(authorizedCapital) ||
    Number(maxTradeAmount) > Number(maxAllocatedCapital)
  )
    throw new BadRequestException('Risk capital limits exceed bot authorization');
  if (!Array.isArray(body.allowedSymbols) || body.allowedSymbols.length === 0)
    throw new BadRequestException('riskProfile.allowedSymbols is required');
  const allowedSymbols = [
    ...new Set(
      body.allowedSymbols.map((symbol) =>
        text(symbol, 'riskProfile.allowedSymbols', 20).toUpperCase(),
      ),
    ),
  ];
  if (!allowedSymbols.every((symbol) => botSymbols.includes(symbol)))
    throw new BadRequestException('Risk symbols must be allowed by the bot');
  const preset = body.preset === undefined ? undefined : text(body.preset, 'riskProfile.preset', 32).toUpperCase();
  if (preset !== undefined && !['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'].includes(preset)) throw new BadRequestException('Invalid risk preset');
  return {
    name,
    maxAllocatedCapital,
    maxTradeAmount,
    maxExposurePercent,
    maxPositionPercent,
    maxPositions,
    maxDailyLossPercent,
    maxDrawdownPercent,
    allowedSymbols,
    cooldownSeconds,
    ...(preset ? { preset: preset as RiskPreset } : {}),
    ...(userId ? { userId } : {}),
  };
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException(`Invalid ${field}`);
  return value.trim();
}
function uuid(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}
function decimal(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(value) ||
    Number(value) <= 0
  )
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}
function percentage(value: unknown, field: string): string {
  const parsed = decimal(value, field);
  if (Number(parsed) > 100) throw new BadRequestException(`Invalid ${field}`);
  return parsed;
}
function positiveInt(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 1)
    throw new BadRequestException(`Invalid ${field}`);
  return Number(value);
}
function nonNegativeInt(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 0)
    throw new BadRequestException(`Invalid ${field}`);
  return Number(value);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
