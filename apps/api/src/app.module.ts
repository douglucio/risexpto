import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ProfileController } from './profile/profile.controller';
import { UsersModule } from './users/users.module';
import { createDatabaseClient } from '@risexpto/database';
import { StrategiesModule } from './strategies/strategies.module';
import { BotsModule } from './bots/bots.module';
import { ExchangeConnectionsModule } from './exchange-connections/exchange-connections.module';
import { QueueModule } from './queue/queue.module';
import { TradingActivityModule } from './trading-activity/trading-activity.module';
import { AdminModule } from './admin/admin.module';
import { BillingModule } from './billing/billing.module';
import { TradersModule } from './traders/traders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BacktestsModule } from './backtests/backtests.module';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && process.env.NODE_ENV !== 'test')
  throw new Error('DATABASE_URL is required for the API');
const database = createDatabaseClient(databaseUrl ?? 'postgresql://test:test@localhost:5432/test');

@Module({
  imports: [
    UsersModule.withDatabase(database),
    AuthModule,
    StrategiesModule,
    BotsModule,
    ExchangeConnectionsModule,
    QueueModule,
    TradingActivityModule,
    AdminModule.withDatabase(database),
    BillingModule.withDatabase(database),
    TradersModule,
    NotificationsModule,
    BacktestsModule,
  ],
  controllers: [AppController, ProfileController],
})
export class AppModule {}
