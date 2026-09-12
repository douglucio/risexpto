import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BacktestsService } from './backtests.service';

@Controller('backtests')
export class BacktestsController {
  constructor(private readonly backtests: BacktestsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.backtests.list(user); }
  @Post() run(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.backtests.run(user, body); }
}
