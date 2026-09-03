import { Body, ConflictException, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BotsService } from './bots.service';
import type { BotStatusChange, CreateBotBody } from './bots.types';
import { QueueService } from '../queue/queue.service';

@Controller('bots')
export class BotsController {
  constructor(private readonly bots: BotsService, private readonly queue: QueueService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.bots.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bots.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateBotBody) {
    return this.bots.create(user, body);
  }

  @Patch(':id/status')
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('status') status: BotStatusChange,
  ) {
    return this.bots.changeStatus(user, id, status);
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
