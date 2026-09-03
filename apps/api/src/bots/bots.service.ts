import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { BotStatusChange, CreateBotBody } from './bots.types';

@Injectable()
export class BotsService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

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
    const input = parseCreateBody(body);
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
      return await this.db.bot.create({
        data: {
          userId,
          name: input.name,
          strategyVersionId: input.strategyVersionId,
          tradingMode: input.tradingMode,
          exchangeConnectionId: input.exchangeConnectionId,
          configuration: {
            create: {
              parameters: input.parameters as Prisma.InputJsonValue,
              allowedSymbols: input.allowedSymbols,
              authorizedCapital: input.authorizedCapital,
              quoteCurrency: input.quoteCurrency,
            },
          },
        },
        include: { configuration: true },
      });
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
}

function applicationUserId(user: AuthenticatedUser): string {
  if (!user.applicationUserId) throw new ConflictException('Application user is not provisioned');
  return user.applicationUserId;
}

function parseCreateBody(body: CreateBotBody) {
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
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
