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
import type { BotStatusChange, CreateBotBody, RiskProfileBody } from './bots.types';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class BotsService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient, @Optional() private readonly billing?: BillingService) {}

  async list(user: AuthenticatedUser) {
    return this.db.bot.findMany({
      where: { userId: applicationUserId(user), archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { configuration: true },
    });
  }

  async get(user: AuthenticatedUser, id: string) {
    const bot = await this.db.bot.findFirst({
      where: { id, userId: applicationUserId(user), archivedAt: null },
      include: { configuration: true },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  async create(user: AuthenticatedUser, body: CreateBotBody) {
    const userId = applicationUserId(user);
    if (this.billing) await this.billing.assertCanCreateBot(user);
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
      return await this.db.$transaction(async (tx) => tx.bot.create({
        data: {
          userId,
          name: input.name,
          strategyVersionId: input.strategyVersionId,
          tradingMode: input.tradingMode,
          ...(input.exchangeConnectionId ? { exchangeConnectionId: input.exchangeConnectionId } : {}),
          configuration: {
            create: {
              parameters: input.parameters as Prisma.InputJsonValue,
              allowedSymbols: input.allowedSymbols,
              authorizedCapital: input.authorizedCapital,
              quoteCurrency: input.quoteCurrency,
            },
          },
          riskProfile: { create: input.riskProfile },
          ...(input.tradingMode === 'PAPER' ? { paperCapitalAllocation: { create: { allocated: 0 } } } : {}),
        },
        include: { configuration: true, riskProfile: true },
      }));
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Bot name already exists');
      throw error;
    }
  }

  async changeStatus(user: AuthenticatedUser, id: string, status: BotStatusChange) {
    const bot = await this.get(user, id);
    const allowed: Record<string, readonly string[]> = {
      DRAFT: ['READY'],
      READY: ['RUNNING'],
      RUNNING: ['PAUSED', 'STOPPED'],
      PAUSED: ['RUNNING', 'STOPPED'],
      STOPPED: ['READY'],
    };
    if (!allowed[bot.status]?.includes(status))
      throw new ConflictException(`Invalid bot transition: ${bot.status} to ${status}`);
    return this.db.bot.update({ where: { id: bot.id }, data: { status } });
  }

  async riskProfile(user: AuthenticatedUser, id: string) {
    const bot = await this.db.bot.findFirst({ where: { id, userId: applicationUserId(user), archivedAt: null }, select: { riskProfile: true } });
    if (!bot?.riskProfile) throw new NotFoundException('Risk profile not found');
    return bot.riskProfile;
  }

  async updateRiskProfile(user: AuthenticatedUser, id: string, body: RiskProfileBody) {
    const userId = applicationUserId(user);
    const bot = await this.db.bot.findFirst({ where: { id, userId, archivedAt: null }, select: { id: true, status: true, configuration: { select: { authorizedCapital: true, allowedSymbols: true } }, riskProfile: true } });
    if (!bot?.configuration || !bot.riskProfile) throw new NotFoundException('Bot or risk profile not found');
    if (bot.status === 'RUNNING') throw new ConflictException('Pause the bot before changing risk limits');
    const input = parseRiskProfile({
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
    }, userId, bot.configuration.authorizedCapital.toString(), bot.configuration.allowedSymbols);
    return this.db.riskProfile.update({ where: { botId: bot.id }, data: input });
  }
}

function applicationUserId(user: AuthenticatedUser): string {
  if (!user.applicationUserId) throw new ConflictException('Application user is not provisioned');
  return user.applicationUserId;
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
  if (!allowedSymbols.every((symbol) => /^[A-Z0-9]{5,20}$/.test(symbol)))
    throw new BadRequestException('Invalid allowedSymbols');
  const authorizedCapital = decimal(body.authorizedCapital, 'authorizedCapital');
  const quoteCurrency = text(body.quoteCurrency, 'quoteCurrency', 16).toUpperCase();
  if (!/^[A-Z]{3,16}$/.test(quoteCurrency)) throw new BadRequestException('Invalid quoteCurrency');
  return {
    name,
    strategyVersionId,
    tradingMode,
    exchangeConnectionId,
    parameters: isRecord(body.parameters) ? body.parameters : {},
    allowedSymbols: [...new Set(allowedSymbols)],
    authorizedCapital,
    quoteCurrency,
    riskProfile: parseRiskProfile(body.riskProfile, userId, authorizedCapital, [...new Set(allowedSymbols)]),
  };
}

function parseRiskProfile(value: unknown, userId: string, authorizedCapital: string, botSymbols: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('riskProfile is required');
  const body = value as RiskProfileBody;
  const name = text(body.name ?? 'Default risk', 'riskProfile.name', 100);
  const maxAllocatedCapital = decimal(body.maxAllocatedCapital, 'riskProfile.maxAllocatedCapital');
  const maxTradeAmount = decimal(body.maxTradeAmount, 'riskProfile.maxTradeAmount');
  const maxExposurePercent = percentage(body.maxExposurePercent, 'riskProfile.maxExposurePercent');
  const maxPositionPercent = percentage(body.maxPositionPercent, 'riskProfile.maxPositionPercent');
  const maxDailyLossPercent = percentage(body.maxDailyLossPercent, 'riskProfile.maxDailyLossPercent');
  const maxDrawdownPercent = percentage(body.maxDrawdownPercent, 'riskProfile.maxDrawdownPercent');
  const maxPositions = positiveInt(body.maxPositions, 'riskProfile.maxPositions');
  const cooldownSeconds = nonNegativeInt(body.cooldownSeconds ?? 0, 'riskProfile.cooldownSeconds');
  if (Number(maxAllocatedCapital) > Number(authorizedCapital) || Number(maxTradeAmount) > Number(maxAllocatedCapital))
    throw new BadRequestException('Risk capital limits exceed bot authorization');
  if (!Array.isArray(body.allowedSymbols) || body.allowedSymbols.length === 0)
    throw new BadRequestException('riskProfile.allowedSymbols is required');
  const allowedSymbols = [...new Set(body.allowedSymbols.map((symbol) => text(symbol, 'riskProfile.allowedSymbols', 20).toUpperCase()))];
  if (!allowedSymbols.every((symbol) => botSymbols.includes(symbol))) throw new BadRequestException('Risk symbols must be allowed by the bot');
  return { name, maxAllocatedCapital, maxTradeAmount, maxExposurePercent, maxPositionPercent, maxPositions, maxDailyLossPercent, maxDrawdownPercent, allowedSymbols, cooldownSeconds, ...(userId ? { userId } : {}) };
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
  if (!Number.isInteger(value) || Number(value) < 1) throw new BadRequestException(`Invalid ${field}`);
  return Number(value);
}
function nonNegativeInt(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) throw new BadRequestException(`Invalid ${field}`);
  return Number(value);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
