import { Module } from '@nestjs/common';
import { TradingActivityController } from './trading-activity.controller';
import { TradingActivityService } from './trading-activity.service';

@Module({ controllers: [TradingActivityController], providers: [TradingActivityService] })
export class TradingActivityModule {}
