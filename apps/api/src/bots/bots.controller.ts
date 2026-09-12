import { Body, ConflictException, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BotsService } from './bots.service';
import type { BotStatusChange, CreateBotBody, RiskProfileBody, StopModeChange } from './bots.types';
import { QueueService } from '../queue/queue.service';

@Controller('bots')
export class BotsController {
  constructor(
    private readonly bots: BotsService,
    private readonly queue: QueueService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.bots.list(user);
  }

  @Get(':id/activity')
  activity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.bots.activity(user, id, limit, offset);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bots.get(user, id);
  }

  @Get(':id/risk-profile')
  riskProfile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bots.riskProfile(user, id);
  }

  @Patch(':id/risk-profile')
  updateRiskProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RiskProfileBody,
  ) {
    return this.bots.updateRiskProfile(user, id, body);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateBotBody) {
    return this.bots.create(user, body);
  }

  @Patch(':id/status')
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status?: BotStatusChange; stopMode?: StopModeChange } | BotStatusChange,
  ) {
    return typeof body === 'string'
      ? this.bots.changeStatus(user, id, body)
      : this.bots.changeStatus(user, id, body.status as BotStatusChange, body.stopMode);
  }

  @Post(':id/cycle')
  async cycle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('idempotencyKey') idempotencyKey?: string,
  ) {
    const bot = await this.bots.get(user, id);
    if (bot.tradingMode !== 'PAPER' || bot.status !== 'RUNNING')
      throw new ConflictException('Only running PAPER bots can enqueue a cycle');
    const key = idempotencyKey?.trim() || `bot-cycle:${bot.id}:${Date.now()}`;
    const job = await this.queue.enqueueBotCycle(bot.id, key);
    return { queued: true, jobId: job.id, botId: bot.id };
  }
}
