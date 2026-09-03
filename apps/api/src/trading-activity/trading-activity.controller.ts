import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TradingActivityService } from './trading-activity.service';

@Controller()
export class TradingActivityController {
  constructor(private readonly activity: TradingActivityService) {}

  @Get('trades')
  trades(@CurrentUser() user: AuthenticatedUser) { return this.activity.trades(user); }

  @Get('positions')
  positions(@CurrentUser() user: AuthenticatedUser) { return this.activity.positions(user); }
}
