import { Module } from '@nestjs/common';
import { ExchangeConnectionsController } from './exchange-connections.controller';
import { ExchangeConnectionsService } from './exchange-connections.service';

@Module({ controllers: [ExchangeConnectionsController], providers: [ExchangeConnectionsService] })
export class ExchangeConnectionsModule {}
